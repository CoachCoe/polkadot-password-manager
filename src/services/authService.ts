// Polkadot Password Manager
// Integrated authentication service combining SSO and wallet functionality

import { createLogger } from '../utils/logger';
import { SSOService, type SSOSession } from './ssoService';
import { WalletService, type WalletAccount } from './walletService';
import { ConfigService } from './configService';

const logger = createLogger('auth-service');

export interface AuthSession {
  sessionId: string;
  userId: string;
  address: string;
  walletType: string;
  walletAccount: WalletAccount;
  expiresAt: number;
  accessToken: string;
  refreshToken: string;
}

export interface AuthChallenge {
  challengeId: string;
  message: string;
  expiresAt: number;
  qrCode?: string; // For mobile wallet authentication
}

export class AuthService {
  private ssoService: SSOService;
  private walletService: WalletService;
  private config: ConfigService;
  private activeSessions: Map<string, AuthSession> = new Map();

  constructor(config: ConfigService) {
    this.config = config;
    this.ssoService = new SSOService(config.getSSOConfig());
    this.walletService = new WalletService(config.getWalletConfig().ss58Format);
  }

  /**
   * Initialize the authentication service
   */
  async initialize(): Promise<void> {
    logger.info('Initializing authentication service');

    // Check SSO server health
    const ssoHealthy = await this.ssoService.checkHealth();
    if (!ssoHealthy) {
      logger.warn('SSO server is not available', { 
        serverUrl: this.config.getSSOConfig().serverUrl 
      });
    }

    logger.info('Authentication service initialized successfully');
  }

  /**
   * Create an authentication challenge for wallet signing
   */
  async createAuthChallenge(address: string, walletType: string = 'polkadot-js'): Promise<AuthChallenge> {
    try {
      logger.info('Creating authentication challenge', { address, walletType });

      // Create SSO challenge
      const ssoChallenge = await this.ssoService.createChallenge(address, walletType);

      // Generate QR code for mobile wallets if needed
      let qrCode: string | undefined;
      if (walletType === 'mobile' || walletType === 'qr') {
        qrCode = await this.generateQRCode(ssoChallenge.message);
      }

      const challenge: AuthChallenge = {
        challengeId: ssoChallenge.challengeId,
        message: ssoChallenge.message,
        expiresAt: ssoChallenge.expiresAt,
        ...(qrCode && { qrCode }),
      };

      logger.info('Authentication challenge created successfully', { 
        challengeId: challenge.challengeId 
      });

      return challenge;
    } catch (error) {
      logger.error('Failed to create authentication challenge', { error });
      throw new Error(`Failed to create authentication challenge: ${error}`);
    }
  }

  /**
   * Check the status of an authentication challenge
   */
  async checkChallengeStatus(challengeId: string): Promise<{ 
    status: string; 
    session?: AuthSession 
  }> {
    try {
      logger.info('Checking authentication challenge status', { challengeId });

      const result = await this.ssoService.checkChallengeStatus(challengeId);

      if (result.session) {
        // Convert SSO session to Auth session
        const authSession = await this.convertSSOSessionToAuthSession(result.session);
        this.activeSessions.set(authSession.sessionId, authSession);
        
        return {
          status: result.status,
          session: authSession,
        };
      }

      return {
        status: result.status,
      };
    } catch (error) {
      logger.error('Failed to check authentication challenge status', { error });
      throw new Error(`Failed to check authentication challenge status: ${error}`);
    }
  }

  /**
   * Verify a signed message and create an authenticated session
   */
  async verifySignature(challengeId: string, signature: string): Promise<AuthSession> {
    try {
      logger.info('Verifying authentication signature', { challengeId });

      // Verify signature with SSO service
      const ssoSession = await this.ssoService.verifySignature(challengeId, signature);

      // Convert to Auth session
      const authSession = await this.convertSSOSessionToAuthSession(ssoSession);
      this.activeSessions.set(authSession.sessionId, authSession);

      logger.info('Authentication signature verified successfully', { 
        sessionId: authSession.sessionId 
      });

      return authSession;
    } catch (error) {
      logger.error('Failed to verify authentication signature', { error });
      throw new Error(`Failed to verify authentication signature: ${error}`);
    }
  }

  /**
   * Get current authenticated session
   */
  async getSession(sessionId: string): Promise<AuthSession | null> {
    try {
      // Check local cache first
      if (this.activeSessions.has(sessionId)) {
        const session = this.activeSessions.get(sessionId)!;
        
        // Check if session is still valid
        if (Date.now() < session.expiresAt) {
          return session;
        } else {
          // Session expired, remove from cache
          this.activeSessions.delete(sessionId);
        }
      }

      // Fetch from SSO service
      const ssoSession = await this.ssoService.getSession(sessionId);
      if (!ssoSession) {
        return null;
      }

      // Convert to Auth session
      const authSession = await this.convertSSOSessionToAuthSession(ssoSession);
      this.activeSessions.set(authSession.sessionId, authSession);

      return authSession;
    } catch (error) {
      logger.error('Failed to get authentication session', { error });
      return null;
    }
  }

  /**
   * Sign out and destroy session
   */
  async signOut(sessionId: string): Promise<void> {
    try {
      logger.info('Signing out authentication session', { sessionId });

      // Sign out from SSO service
      await this.ssoService.signOut(sessionId);

      // Remove from local cache
      this.activeSessions.delete(sessionId);

      logger.info('Authentication session signed out successfully', { sessionId });
    } catch (error) {
      logger.error('Failed to sign out authentication session', { error });
      throw new Error(`Failed to sign out authentication session: ${error}`);
    }
  }

  /**
   * Refresh an expired session
   */
  async refreshSession(refreshToken: string): Promise<AuthSession> {
    try {
      logger.info('Refreshing authentication session');

      // Refresh SSO session
      const ssoSession = await this.ssoService.refreshSession(refreshToken);

      // Convert to Auth session
      const authSession = await this.convertSSOSessionToAuthSession(ssoSession);
      this.activeSessions.set(authSession.sessionId, authSession);

      logger.info('Authentication session refreshed successfully', { 
        sessionId: authSession.sessionId 
      });

      return authSession;
    } catch (error) {
      logger.error('Failed to refresh authentication session', { error });
      throw new Error(`Failed to refresh authentication session: ${error}`);
    }
  }

  /**
   * Get wallet service for direct wallet operations
   */
  getWalletService(): WalletService {
    return this.walletService;
  }

  /**
   * Get SSO service for direct SSO operations
   */
  getSSOService(): SSOService {
    return this.ssoService;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): AuthSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now >= session.expiresAt) {
        this.activeSessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up expired sessions', { cleanedCount });
    }
  }

  private async convertSSOSessionToAuthSession(ssoSession: SSOSession): Promise<AuthSession> {
    // Get wallet account information
    const walletAccount = await this.getWalletAccountFromAddress(ssoSession.address);

    return {
      sessionId: ssoSession.sessionId,
      userId: ssoSession.userId,
      address: ssoSession.address,
      walletType: ssoSession.walletType,
      walletAccount,
      expiresAt: ssoSession.expiresAt,
      accessToken: ssoSession.accessToken,
      refreshToken: ssoSession.refreshToken,
    };
  }

  private async getWalletAccountFromAddress(address: string): Promise<WalletAccount> {
    // Try to get from wallet service first
    const existingAccount = this.walletService.getKeyringPair(address);
    if (existingAccount) {
      return {
        address: existingAccount.address,
        name: existingAccount.meta.name || 'Unknown',
        source: 'keyring',
        isHardware: false,
      };
    }

    // Create a basic account info for the address
    return {
      address,
      name: 'External Account',
      source: 'external',
      isHardware: false,
    };
  }

  private async generateQRCode(message: string): Promise<string> {
    // This would integrate with a QR code library
    // For now, return a placeholder
    return `data:image/png;base64,${Buffer.from(message).toString('base64')}`;
  }
}
