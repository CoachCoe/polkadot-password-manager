// Polkadot Password Manager
// Main PasswordManager class for managing credentials

import { CredentialService } from './services/credentialService';
import { createCredentialRouter } from './routes/credentials';
import type { PasswordManagerOptions } from './types';
import { DEFAULT_KUSAMA_CONFIG } from './services/blockchainService';

export class PasswordManager {
  private credentialService: CredentialService;
  private isInitialized = false;

  constructor(options: PasswordManagerOptions) {
    this.credentialService = new CredentialService(
      options.encryptionKey,
      options.blockchainConfig || DEFAULT_KUSAMA_CONFIG
    );
  }

  /**
   * Initialize the password manager and connect to Kusama chain
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.credentialService.initialize();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize PasswordManager: ${error}`);
    }
  }

  /**
   * Create a new credential
   */
  async createCredential(request: any, userAddress: string, signer: any) {
    return this.credentialService.createCredential(request, userAddress, signer);
  }

  /**
   * Get user credentials
   */
  async getUserCredentials(userAddress: string) {
    return this.credentialService.getUserCredentials(userAddress);
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
  async revokeCredential(credentialId: string, userAddress: string, signer: any) {
    return this.credentialService.revokeCredential(credentialId, userAddress, signer);
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
