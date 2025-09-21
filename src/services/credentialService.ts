import * as crypto from 'crypto';
import { createLogger } from '../utils/logger';
import { BlockchainService, DEFAULT_KUSAMA_CONFIG } from './blockchainService';
import { WalletService } from './walletService';
// import type { WalletAccount } from './walletService';
import { encryptData, decryptData } from '../utils/encryption';
import type { Credential, CreateCredentialRequest, ShareCredentialRequest, VerifyCredentialRequest } from '../types/credential';

const logger = createLogger('credential-service');

export class CredentialService {
  private blockchainService: BlockchainService;
  private walletService: WalletService;
  private encryptionKey: string;

  constructor(encryptionKey: string, blockchainConfig = DEFAULT_KUSAMA_CONFIG) {
    this.encryptionKey = encryptionKey;
    this.blockchainService = new BlockchainService(blockchainConfig);
    this.walletService = new WalletService(blockchainConfig.ss58Format);
  }

  /**
   * Initialize the credential service
   */
  async initialize(): Promise<void> {
    try {
      await this.blockchainService.connect();
      logger.info('Credential service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize credential service', { error });
      throw new Error(`Failed to initialize credential service: ${error}`);
    }
  }

  /**
   * Create a new credential and store it on Kusama chain
   */
  async createCredential(request: CreateCredentialRequest, userAddress: string, signer: any): Promise<Credential> {
    try {
      const id = crypto.randomUUID();
      
      // Encrypt the credential data
      const encryptedData = encryptData(JSON.stringify(request.credential_data), this.encryptionKey);
      
      // Prepare metadata
      const metadata = {
        type: 'password',
        created_at: Date.now(),
        expires_at: request.expires_at,
        ...request.metadata
      };

      // Store on Kusama chain
      const storedCredential = await this.blockchainService.storeCredential(
        id,
        userAddress,
        encryptedData,
        metadata,
        signer
      );

      const credential: Credential = {
        id: storedCredential.id,
        user_address: userAddress,
        credential_type_id: 'password',
        issuer_address: userAddress,
        credential_data: encryptedData,
        credential_hash: crypto.createHash('sha256').update(encryptedData).digest('hex'),
        status: 'active',
        issued_at: storedCredential.timestamp,
        expires_at: request.expires_at || 0,
        created_at: storedCredential.timestamp,
        updated_at: storedCredential.timestamp,
        metadata: storedCredential.metadata
      };

      logger.info('Credential created and stored on Kusama chain', { 
        id, 
        userAddress,
        blockNumber: storedCredential.blockNumber 
      });

      return credential;
    } catch (error) {
      logger.error('Failed to create credential', { error, userAddress });
      throw new Error(`Failed to create credential: ${error}`);
    }
  }

  /**
   * Get a credential by ID from Kusama chain
   */
  async getCredential(id: string, userAddress: string): Promise<Credential | null> {
    try {
      const storedCredential = await this.blockchainService.getCredential(id, userAddress);
      
      if (!storedCredential) {
        return null;
      }

      const credential: Credential = {
        id: storedCredential.id,
        user_address: storedCredential.userAddress,
        credential_type_id: 'password',
        issuer_address: storedCredential.userAddress,
        credential_data: storedCredential.encryptedData,
        credential_hash: crypto.createHash('sha256').update(storedCredential.encryptedData).digest('hex'),
        status: 'active',
        issued_at: storedCredential.timestamp,
        created_at: storedCredential.timestamp,
        updated_at: storedCredential.timestamp,
        metadata: storedCredential.metadata
      };

      logger.info('Credential retrieved from Kusama chain', { id, userAddress });
      return credential;
    } catch (error) {
      logger.error('Failed to get credential', { error, id, userAddress });
      throw new Error(`Failed to get credential: ${error}`);
    }
  }

  /**
   * Get all credentials for a user from Kusama chain
   */
  async getUserCredentials(userAddress: string): Promise<Credential[]> {
    try {
      const storedCredentials = await this.blockchainService.getUserCredentials(userAddress);
      
      const credentials: Credential[] = storedCredentials.map(stored => ({
        id: stored.id,
        user_address: stored.userAddress,
        credential_type_id: 'password',
        issuer_address: stored.userAddress,
        credential_data: stored.encryptedData,
        credential_hash: crypto.createHash('sha256').update(stored.encryptedData).digest('hex'),
        status: 'active',
        issued_at: stored.timestamp,
        created_at: stored.timestamp,
        updated_at: stored.timestamp,
        metadata: stored.metadata
      }));

      logger.info('User credentials retrieved from Kusama chain', { 
        userAddress, 
        count: credentials.length 
      });

      return credentials;
    } catch (error) {
      logger.error('Failed to get user credentials', { error, userAddress });
      throw new Error(`Failed to get user credentials: ${error}`);
    }
  }

  /**
   * Decrypt credential data
   */
  async decryptCredentialData(credential: Credential): Promise<Record<string, any>> {
    try {
      const decryptedData = decryptData(credential.credential_data, this.encryptionKey);
      return JSON.parse(decryptedData);
    } catch (error) {
      logger.error('Failed to decrypt credential data', { error, credentialId: credential.id });
      throw new Error(`Failed to decrypt credential data: ${error}`);
    }
  }

  /**
   * Share a credential (placeholder - would need additional blockchain logic)
   */
  async shareCredential(request: ShareCredentialRequest): Promise<any> {
    // This would require additional blockchain logic for sharing
    // For now, we'll just log the request
    logger.info('Credential share requested', { 
      credentialId: request.credential_id,
      sharedWith: request.shared_with_address 
    });
    
    throw new Error('Credential sharing not yet implemented');
  }

  /**
   * Verify a credential (placeholder - would need additional blockchain logic)
   */
  async verifyCredential(request: VerifyCredentialRequest): Promise<any> {
    // This would require additional blockchain logic for verification
    // For now, we'll just log the request
    logger.info('Credential verification requested', { 
      credentialId: request.credential_id,
      verificationType: request.verification_type 
    });
    
    throw new Error('Credential verification not yet implemented');
  }

  /**
   * Revoke a credential on Kusama chain
   */
  async revokeCredential(credentialId: string, userAddress: string, signer: any): Promise<void> {
    try {
      await this.blockchainService.revokeCredential(credentialId, userAddress, signer);
      logger.info('Credential revoked on Kusama chain', { credentialId, userAddress });
    } catch (error) {
      logger.error('Failed to revoke credential', { error, credentialId, userAddress });
      throw new Error(`Failed to revoke credential: ${error}`);
    }
  }

  /**
   * Get blockchain service instance
   */
  getBlockchainService(): BlockchainService {
    return this.blockchainService;
  }

  /**
   * Get wallet service instance
   */
  getWalletService(): WalletService {
    return this.walletService;
  }

  /**
   * Check if connected to Kusama chain
   */
  isConnected(): boolean {
    return this.blockchainService.isChainConnected();
  }

  /**
   * Disconnect from Kusama chain
   */
  async disconnect(): Promise<void> {
    await this.blockchainService.disconnect();
    await this.walletService.disconnect();
  }
}
