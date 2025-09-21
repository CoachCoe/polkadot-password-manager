// Polkadot Password Manager
// SSO Integration Service for authentication with polkadot-sso

import { createLogger } from '../utils/logger';
import { validateString, validatePolkadotAddress } from '../utils/validation';
import { createAuthError, ErrorCode, ErrorSeverity, handleError } from '../utils/errors';

const logger = createLogger('sso-service');

export interface SSOConfig {
  serverUrl: string;
  clientId: string;
  clientSecret: string;
}

export interface SSOChallenge {
  challengeId: string;
  message: string;
  expiresAt: number;
}

export interface SSOSession {
  sessionId: string;
  userId: string;
  address: string;
  walletType: string;
  expiresAt: number;
  accessToken: string;
  refreshToken: string;
}

export class SSOService {
  private config: SSOConfig;
  private baseUrl: string;

  constructor(config: SSOConfig) {
    this.config = config;
    this.baseUrl = `${config.serverUrl}/api/auth`;
  }

  /**
   * Create an authentication challenge for wallet signing
   */
  async createChallenge(address: string, walletType: string = 'polkadot-js'): Promise<SSOChallenge> {
    try {
      // SECURITY: Validate input parameters
      const addressValidation = validatePolkadotAddress(address);
      if (!addressValidation.isValid) {
        throw createAuthError(
          ErrorCode.INVALID_ADDRESS,
          `Invalid Polkadot address: ${addressValidation.error}`,
          { address, walletType },
          ErrorSeverity.HIGH
        );
      }

      const walletTypeValidation = validateString(walletType, {
        required: true,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9\-_]+$/
      });
      if (!walletTypeValidation.isValid) {
        throw createAuthError(
          ErrorCode.VALIDATION_ERROR,
          `Invalid wallet type: ${walletTypeValidation.error}`,
          { address, walletType },
          ErrorSeverity.MEDIUM
        );
      }

      logger.info('Creating SSO challenge', { 
        address: addressValidation.sanitized, 
        walletType: walletTypeValidation.sanitized 
      });

      const url = new URL(`${this.baseUrl}/challenge`);
      url.searchParams.set('client_id', this.config.clientId);
      url.searchParams.set('address', addressValidation.sanitized!);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Polkadot-Password-Manager/1.0.0',
          'X-Client-Version': '1.0.0'
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 seconds
      });

      if (!response.ok) {
        const errorMessage = `SSO challenge creation failed: ${response.status} ${response.statusText}`;
        logger.error('SSO challenge creation failed', { 
          status: response.status, 
          statusText: response.statusText,
          address: addressValidation.sanitized
        });
        
        throw createAuthError(
          ErrorCode.SSO_CHALLENGE_FAILED,
          errorMessage,
          { status: response.status, address: addressValidation.sanitized },
          ErrorSeverity.HIGH
        );
      }

      // The SSO server returns HTML with embedded challenge data
      const html = await response.text();
      
      // SECURITY: Limit HTML size to prevent memory issues
      if (html.length > 1000000) { // 1MB limit
        throw createAuthError(
          ErrorCode.SSO_ERROR,
          'SSO response too large',
          { htmlLength: html.length },
          ErrorSeverity.HIGH
        );
      }
      
      // Debug: Log a snippet of the HTML response (sanitized)
      logger.info('SSO HTML response received', { 
        htmlLength: html.length,
        hasChallengeData: html.includes('window.CHALLENGE_DATA')
      });
      
      // Extract challenge data from the HTML response
      const challengeData = this.extractChallengeDataFromHTML(html);
      
      if (!challengeData) {
        logger.error('Failed to extract challenge data from SSO response', { 
          htmlLength: html.length,
          hasWindowChallengeData: html.includes('window.CHALLENGE_DATA')
        });
        
        throw createAuthError(
          ErrorCode.SSO_ERROR,
          'Failed to extract challenge data from SSO response',
          { htmlLength: html.length },
          ErrorSeverity.HIGH
        );
      }

      // SECURITY: Validate extracted challenge data
      const challengeIdValidation = validateString(challengeData.challengeId || '', {
        required: true,
        minLength: 10,
        maxLength: 100,
        pattern: /^[a-zA-Z0-9\-_]+$/
      });
      
      if (!challengeIdValidation.isValid) {
        throw createAuthError(
          ErrorCode.SSO_ERROR,
          `Invalid challenge ID format: ${challengeIdValidation.error}`,
          { challengeId: challengeData.challengeId || 'undefined' },
          ErrorSeverity.HIGH
        );
      }

      const messageValidation = validateString(challengeData.message || '', {
        required: true,
        minLength: 10,
        maxLength: 1000
      });
      
      if (!messageValidation.isValid) {
        throw createAuthError(
          ErrorCode.SSO_ERROR,
          `Invalid challenge message format: ${messageValidation.error}`,
          { messageLength: challengeData.message?.length || 0 },
          ErrorSeverity.HIGH
        );
      }

      const challenge: SSOChallenge = {
        challengeId: challengeIdValidation.sanitized!,
        message: messageValidation.sanitized!,
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
      };

      logger.info('SSO challenge created successfully', { 
        challengeId: challenge.challengeId,
        messageLength: challenge.message.length
      });

      return challenge;
    } catch (error) {
      handleError(error as Error, { address, walletType, operation: 'createChallenge' });
      throw error;
    }
  }

  /**
   * Extract challenge data from SSO HTML response
   */
  private extractChallengeDataFromHTML(html: string): { challengeId: string; message: string } | null {
    try {
      // Look for the window.CHALLENGE_DATA object in the HTML
      // Use a more robust regex that handles multiline objects
      const challengeDataMatch = html.match(/window\.CHALLENGE_DATA\s*=\s*({[\s\S]*?});/);
      
      if (!challengeDataMatch) {
        logger.error('Challenge data object not found in HTML response');
        return null;
      }

      // Parse the JavaScript object (convert to valid JSON first)
      const challengeDataStr = challengeDataMatch[1]!;
      // Convert JavaScript object syntax to JSON by adding quotes around property names
      const jsonStr = challengeDataStr.replace(/(\w+):/g, '"$1":');
      const challengeData = JSON.parse(jsonStr);

      if (!challengeData.challengeId || !challengeData.message) {
        logger.error('Invalid challenge data structure', { challengeData });
        return null;
      }

      return {
        challengeId: challengeData.challengeId,
        message: challengeData.message,
      };
    } catch (error) {
      logger.error('Failed to extract challenge data from HTML', { error });
      return null;
    }
  }

  /**
   * Check the status of an authentication challenge
   */
  async checkChallengeStatus(challengeId: string): Promise<{ status: string; session?: SSOSession }> {
    try {
      logger.info('Checking SSO challenge status', { challengeId });

      const response = await fetch(`${this.baseUrl}/status/${challengeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`SSO challenge status check failed: ${response.statusText}`);
      }

      const result = await response.json() as { status: string; session?: SSOSession; message?: string; expiresAt?: number };
      logger.info('SSO challenge status retrieved', { challengeId, status: result.status });

      return result;
    } catch (error) {
      logger.error('Failed to check SSO challenge status', { error });
      throw new Error(`Failed to check SSO challenge status: ${error}`);
    }
  }

  /**
   * Verify a signed message and create a session
   */
  async verifySignature(challengeId: string, signature: string): Promise<SSOSession> {
    try {
      logger.info('Verifying SSO signature', { challengeId });

      const response = await fetch(`${this.baseUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.clientSecret}`,
        },
        body: JSON.stringify({
          challengeId,
          signature,
          clientId: this.config.clientId,
        }),
      });

      if (!response.ok) {
        throw new Error(`SSO signature verification failed: ${response.statusText}`);
      }

      const session = await response.json() as SSOSession;
      logger.info('SSO signature verified successfully', { sessionId: session.sessionId });

      return session;
    } catch (error) {
      logger.error('Failed to verify SSO signature', { error });
      throw new Error(`Failed to verify SSO signature: ${error}`);
    }
  }

  /**
   * Get current session information
   */
  async getSession(sessionId: string): Promise<SSOSession | null> {
    try {
      logger.info('Getting SSO session', { sessionId });

      const response = await fetch(`${this.baseUrl}/session`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
        },
      });

      if (response.status === 404) {
        logger.info('SSO session not found', { sessionId });
        return null;
      }

      if (!response.ok) {
        throw new Error(`SSO session retrieval failed: ${response.statusText}`);
      }

      const session = await response.json() as SSOSession;
      logger.info('SSO session retrieved successfully', { sessionId });

      return session;
    } catch (error) {
      logger.error('Failed to get SSO session', { error });
      throw new Error(`Failed to get SSO session: ${error}`);
    }
  }

  /**
   * Sign out and destroy session
   */
  async signOut(sessionId: string): Promise<void> {
    try {
      logger.info('Signing out SSO session', { sessionId });

      const response = await fetch(`${this.baseUrl}/signout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
        },
      });

      if (!response.ok) {
        throw new Error(`SSO sign out failed: ${response.statusText}`);
      }

      logger.info('SSO session signed out successfully', { sessionId });
    } catch (error) {
      logger.error('Failed to sign out SSO session', { error });
      throw new Error(`Failed to sign out SSO session: ${error}`);
    }
  }

  /**
   * Refresh an expired session
   */
  async refreshSession(refreshToken: string): Promise<SSOSession> {
    try {
      logger.info('Refreshing SSO session');

      const response = await fetch(`${this.baseUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.clientSecret}`,
        },
        body: JSON.stringify({
          refreshToken,
          clientId: this.config.clientId,
        }),
      });

      if (!response.ok) {
        throw new Error(`SSO session refresh failed: ${response.statusText}`);
      }

      const session = await response.json() as SSOSession;
      logger.info('SSO session refreshed successfully', { sessionId: session.sessionId });

      return session;
    } catch (error) {
      logger.error('Failed to refresh SSO session', { error });
      throw new Error(`Failed to refresh SSO session: ${error}`);
    }
  }

  /**
   * Check if SSO server is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.serverUrl}/health`, {
        method: 'GET',
      });

      return response.ok;
    } catch (error) {
      logger.error('SSO server health check failed', { error });
      return false;
    }
  }
}
