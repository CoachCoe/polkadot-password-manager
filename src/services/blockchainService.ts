// Polkadot Password Manager
// Blockchain service for Kusama chain interactions

import { ApiPromise, WsProvider } from '@polkadot/api';
import type { KeyringPair } from '@polkadot/keyring/types';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('blockchain-service');

export interface BlockchainConfig {
  rpcUrl: string;
  chainId: string;
  ss58Format: number;
  storagePallet: string;
  storageMethod: string;
}

export interface StoredCredential {
  id: string;
  userAddress: string;
  encryptedData: string;
  metadata: string;
  timestamp: number;
  blockNumber: number;
}

export class BlockchainService {
  private api: ApiPromise | null = null;
  private config: BlockchainConfig;
  private isConnected = false;

  constructor(config: BlockchainConfig) {
    this.config = config;
  }

  /**
   * Initialize connection to Kusama chain
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Kusama chain', { rpcUrl: this.config.rpcUrl });
      
      const provider = new WsProvider(this.config.rpcUrl);
      this.api = await ApiPromise.create({ provider });
      
      await this.api.isReady;
      this.isConnected = true;
      
      logger.info('Successfully connected to Kusama chain', {
        chain: this.api.runtimeChain.toString(),
        version: this.api.runtimeVersion.toString()
      });
    } catch (error) {
      logger.error('Failed to connect to Kusama chain', { error });
      throw new Error(`Failed to connect to Kusama chain: ${error}`);
    }
  }

  /**
   * Disconnect from Kusama chain
   */
  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
      this.isConnected = false;
      logger.info('Disconnected from Kusama chain');
    }
  }

  /**
   * Store encrypted credential on Kusama chain
   */
  async storeCredential(
    credentialId: string,
    userAddress: string,
    encryptedData: string,
    metadata: Record<string, any>,
    signer: KeyringPair
  ): Promise<StoredCredential> {
    if (!this.api || !this.isConnected) {
      throw new Error('Not connected to Kusama chain');
    }

    try {
      logger.info('Storing credential on Kusama chain', { credentialId, userAddress });

      // Create the transaction
      const tx = this.api.tx[this.config.storagePallet]?.['storeCredential']?.(
        credentialId,
        userAddress,
        encryptedData,
        JSON.stringify(metadata)
      );
      
      if (!tx) {
        throw new Error(`Transaction method 'storeCredential' not found in pallet '${this.config.storagePallet}'`);
      }

      // Sign and send the transaction
      const hash = await tx.signAndSend(signer);
      
      // Wait for the transaction to be included in a block
      const blockHash = await hash;
      const block = await this.api.rpc.chain.getBlock(blockHash);
      const blockNumber = block.block.header.number.toNumber();

      const storedCredential: StoredCredential = {
        id: credentialId,
        userAddress,
        encryptedData,
        metadata: JSON.stringify(metadata),
        timestamp: Date.now(),
        blockNumber
      };

      logger.info('Credential stored successfully on Kusama chain', {
        credentialId,
        blockNumber,
        blockHash: blockHash.toString()
      });

      return storedCredential;
    } catch (error) {
      logger.error('Failed to store credential on Kusama chain', { error, credentialId });
      throw new Error(`Failed to store credential: ${error}`);
    }
  }

  /**
   * Retrieve encrypted credential from Kusama chain
   */
  async getCredential(credentialId: string, userAddress: string): Promise<StoredCredential | null> {
    if (!this.api || !this.isConnected) {
      throw new Error('Not connected to Kusama chain');
    }

    try {
      logger.info('Retrieving credential from Kusama chain', { credentialId, userAddress });

      // Query the storage
      const result = await this.api.query[this.config.storagePallet]?.[this.config.storageMethod]?.(credentialId, userAddress);
      
      if (!result) {
        throw new Error(`Query method '${this.config.storageMethod}' not found in pallet '${this.config.storagePallet}'`);
      }

      if (result.isEmpty) {
        logger.info('Credential not found on Kusama chain', { credentialId });
        return null;
      }

      // Decode the stored data
      const storedData = result.toHuman() as any;
      
      const credential: StoredCredential = {
        id: storedData.id,
        userAddress: storedData.userAddress,
        encryptedData: storedData.encryptedData,
        metadata: storedData.metadata,
        timestamp: parseInt(storedData.timestamp),
        blockNumber: parseInt(storedData.blockNumber)
      };

      logger.info('Credential retrieved successfully from Kusama chain', { credentialId });
      return credential;
    } catch (error) {
      logger.error('Failed to retrieve credential from Kusama chain', { error, credentialId });
      throw new Error(`Failed to retrieve credential: ${error}`);
    }
  }

  /**
   * List all credentials for a user
   */
  async getUserCredentials(userAddress: string): Promise<StoredCredential[]> {
    if (!this.api || !this.isConnected) {
      throw new Error('Not connected to Kusama chain');
    }

    try {
      logger.info('Retrieving user credentials from Kusama chain', { userAddress });

      // Query all credentials for the user
      const result = await this.api.query[this.config.storagePallet]?.['userCredentials']?.(userAddress);
      
      if (!result) {
        throw new Error(`Query method 'userCredentials' not found in pallet '${this.config.storagePallet}'`);
      }

      if (result.isEmpty) {
        return [];
      }

      const credentials: StoredCredential[] = [];
      const entries = result.toHuman() as any[];

      for (const entry of entries) {
        credentials.push({
          id: entry.id,
          userAddress: entry.userAddress,
          encryptedData: entry.encryptedData,
          metadata: entry.metadata,
          timestamp: parseInt(entry.timestamp),
          blockNumber: parseInt(entry.blockNumber)
        });
      }

      logger.info('User credentials retrieved successfully', { 
        userAddress, 
        count: credentials.length 
      });

      return credentials;
    } catch (error) {
      logger.error('Failed to retrieve user credentials from Kusama chain', { error, userAddress });
      throw new Error(`Failed to retrieve user credentials: ${error}`);
    }
  }

  /**
   * Revoke a credential on Kusama chain
   */
  async revokeCredential(credentialId: string, userAddress: string, signer: KeyringPair): Promise<void> {
    if (!this.api || !this.isConnected) {
      throw new Error('Not connected to Kusama chain');
    }

    try {
      logger.info('Revoking credential on Kusama chain', { credentialId, userAddress });

      // Create the revocation transaction
      const tx = this.api.tx[this.config.storagePallet]?.['revokeCredential']?.(credentialId, userAddress);
      
      if (!tx) {
        throw new Error(`Transaction method 'revokeCredential' not found in pallet '${this.config.storagePallet}'`);
      }

      // Sign and send the transaction
      await tx.signAndSend(signer);

      logger.info('Credential revoked successfully on Kusama chain', { credentialId });
    } catch (error) {
      logger.error('Failed to revoke credential on Kusama chain', { error, credentialId });
      throw new Error(`Failed to revoke credential: ${error}`);
    }
  }

  /**
   * Get the current block number
   */
  async getCurrentBlockNumber(): Promise<number> {
    if (!this.api || !this.isConnected) {
      throw new Error('Not connected to Kusama chain');
    }

    const blockNumber = await this.api.rpc.chain.getHeader();
    return blockNumber.number.toNumber();
  }

  /**
   * Check if connected to the chain
   */
  isChainConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get chain information
   */
  async getChainInfo(): Promise<{ chain: string; version: string; blockNumber: number }> {
    if (!this.api || !this.isConnected) {
      throw new Error('Not connected to Kusama chain');
    }

    const blockNumber = await this.getCurrentBlockNumber();
    
    return {
      chain: this.api.runtimeChain.toString(),
      version: this.api.runtimeVersion.toString(),
      blockNumber
    };
  }
}

// Default Kusama configuration
export const DEFAULT_KUSAMA_CONFIG: BlockchainConfig = {
  rpcUrl: process.env['KUSAMA_RPC_URL'] || 'wss://kusama-rpc.polkadot.io',
  chainId: 'kusama',
  ss58Format: 2,
  storagePallet: 'passwordManager',
  storageMethod: 'credentials'
};
