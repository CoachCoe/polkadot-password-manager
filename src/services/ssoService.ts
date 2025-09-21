// Polkadot Password Manager
// SSO Integration Service for authentication with polkadot-sso

import { createLogger } from '../utils/logger.js';

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
      logger.info('Creating SSO challenge', { address, walletType });

      const url = new URL(`${this.baseUrl}/challenge`);
      url.searchParams.set('client_id', this.config.clientId);
      url.searchParams.set('address', address);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`SSO challenge creation failed: ${response.statusText}`);
      }

      // The SSO server returns HTML with embedded challenge data
      const html = await response.text();
      
      // Debug: Log a snippet of the HTML response
      logger.info('SSO HTML response snippet', { 
        htmlSnippet: html.substring(0, 500),
        hasChallengeData: html.includes('window.CHALLENGE_DATA')
      });
      
      // Extract challenge data from the HTML response
      const challengeData = this.extractChallengeDataFromHTML(html);
      
      if (!challengeData) {
        logger.error('Failed to extract challenge data from SSO response', { 
          htmlLength: html.length,
          hasWindowChallengeData: html.includes('window.CHALLENGE_DATA')
        });
        throw new Error('Failed to extract challenge data from SSO response');
      }

      const challenge: SSOChallenge = {
        challengeId: challengeData.challengeId,
        message: challengeData.message,
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
      };

      logger.info('SSO challenge created successfully', { challengeId: challenge.challengeId });

      return challenge;
    } catch (error) {
      logger.error('Failed to create SSO challenge', { error });
      throw new Error(`Failed to create SSO challenge: ${error}`);
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

      // Parse the JavaScript object
      const challengeDataStr = challengeDataMatch[1];
      const challengeData = JSON.parse(challengeDataStr);

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
