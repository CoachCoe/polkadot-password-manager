// Polkadot Password Manager
// Main PasswordManager class for managing credentials

import { CredentialService } from './credentials/services/credentialService';
import { createCredentialRouter } from './credentials/routes/credentials';
import { PasswordManagerOptions, DatabaseConfig, AuditService, CacheService } from './types';

export class PasswordManager {
  private credentialService: CredentialService;
  private options: PasswordManagerOptions;

  constructor(options: PasswordManagerOptions) {
    this.options = options;
    this.credentialService = new CredentialService();
  }

  /**
   * Create a new credential
   */
  async createCredential(request: any) {
    return this.credentialService.createCredential(request);
  }

  /**
   * Get user credentials
   */
  async getUserCredentials(userId: string) {
    return this.credentialService.getUserCredentials(userId);
  }

  /**
   * Share a credential
   */
  async shareCredential(request: any) {
    return this.credentialService.shareCredential(request);
  }

  /**
   * Verify a credential
   */
  async verifyCredential(request: any) {
    return this.credentialService.verifyCredential(request);
  }

  /**
   * Revoke a credential
   */
  async revokeCredential(credentialId: string) {
    return this.credentialService.revokeCredential(credentialId);
  }

  /**
   * Get Express router for API endpoints
   */
  getRouter() {
    return createCredentialRouter(this.credentialService);
  }

  /**
   * Get the credential service instance
   */
  getCredentialService() {
    return this.credentialService;
  }
}
