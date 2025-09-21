// Polkadot Password Manager
// Wallet service for handling wallet connections and transaction signing

import { Keyring } from '@polkadot/keyring';
import type { KeyringPair } from '@polkadot/keyring/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('wallet-service');

export interface WalletAccount {
  address: string;
  name?: string;
  source: string;
  isHardware?: boolean;
}

export interface WalletProvider {
  id: string;
  name: string;
  isAvailable: () => boolean;
  connect: () => Promise<WalletAccount[]>;
  signMessage: (message: string, account: WalletAccount) => Promise<string>;
  signTransaction: (transaction: any, account: WalletAccount) => Promise<string>;
  disconnect: () => Promise<void>;
}

export class WalletService {
  private keyring: Keyring;
  private connectedAccounts: Map<string, WalletAccount> = new Map();
  private providers: Map<string, WalletProvider> = new Map();
  private currentProvider: WalletProvider | null = null;

  constructor(ss58Format: number = 2) {
    this.keyring = new Keyring({ type: 'sr25519', ss58Format });
  }

  /**
   * Register a wallet provider
   */
  registerProvider(provider: WalletProvider): void {
    this.providers.set(provider.id, provider);
    logger.info('Wallet provider registered', { providerId: provider.id, providerName: provider.name });
  }

  /**
   * Get available wallet providers
   */
  getAvailableProviders(): WalletProvider[] {
    return Array.from(this.providers.values()).filter(provider => provider.isAvailable());
  }

  /**
   * Connect to a wallet provider
   */
  async connect(providerId: string): Promise<WalletAccount[]> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Wallet provider not found: ${providerId}`);
    }

    if (!provider.isAvailable()) {
      throw new Error(`Wallet provider not available: ${providerId}`);
    }

    try {
      logger.info('Connecting to wallet provider', { providerId });
      
      const accounts = await provider.connect();
      this.currentProvider = provider;

      // Store connected accounts
      accounts.forEach(account => {
        this.connectedAccounts.set(account.address, account);
      });

      logger.info('Successfully connected to wallet provider', { 
        providerId, 
        accountCount: accounts.length 
      });

      return accounts;
    } catch (error) {
      logger.error('Failed to connect to wallet provider', { error, providerId });
      throw new Error(`Failed to connect to wallet: ${error}`);
    }
  }

  /**
   * Disconnect from current wallet provider
   */
  async disconnect(): Promise<void> {
    if (this.currentProvider) {
      try {
        await this.currentProvider.disconnect();
        this.connectedAccounts.clear();
        this.currentProvider = null;
        logger.info('Disconnected from wallet provider');
      } catch (error) {
        logger.error('Failed to disconnect from wallet provider', { error });
        throw new Error(`Failed to disconnect: ${error}`);
      }
    }
  }

  /**
   * Get connected accounts
   */
  getConnectedAccounts(): WalletAccount[] {
    return Array.from(this.connectedAccounts.values());
  }

  /**
   * Get account by address
   */
  getAccount(address: string): WalletAccount | undefined {
    return this.connectedAccounts.get(address);
  }

  /**
   * Sign a message with the specified account
   */
  async signMessage(message: string, accountAddress: string): Promise<string> {
    const account = this.connectedAccounts.get(accountAddress);
    if (!account) {
      throw new Error(`Account not found: ${accountAddress}`);
    }

    if (!this.currentProvider) {
      throw new Error('No wallet provider connected');
    }

    try {
      logger.info('Signing message', { accountAddress });
      
      const signature = await this.currentProvider.signMessage(message, account);
      
      logger.info('Message signed successfully', { accountAddress });
      return signature;
    } catch (error) {
      logger.error('Failed to sign message', { error, accountAddress });
      throw new Error(`Failed to sign message: ${error}`);
    }
  }

  /**
   * Sign a transaction with the specified account
   */
  async signTransaction(transaction: any, accountAddress: string): Promise<string> {
    const account = this.connectedAccounts.get(accountAddress);
    if (!account) {
      throw new Error(`Account not found: ${accountAddress}`);
    }

    if (!this.currentProvider) {
      throw new Error('No wallet provider connected');
    }

    try {
      logger.info('Signing transaction', { accountAddress });
      
      const signature = await this.currentProvider.signTransaction(transaction, account);
      
      logger.info('Transaction signed successfully', { accountAddress });
      return signature;
    } catch (error) {
      logger.error('Failed to sign transaction', { error, accountAddress });
      throw new Error(`Failed to sign transaction: ${error}`);
    }
  }

  /**
   * Create a keyring pair from a mnemonic or seed
   */
  createKeyringPair(mnemonicOrSeed: string, name?: string): KeyringPair {
    try {
      const pair = this.keyring.addFromMnemonic(mnemonicOrSeed, { name: name || 'default' });
      logger.info('Keyring pair created', { address: pair.address, name });
      return pair;
    } catch (error) {
      logger.error('Failed to create keyring pair', { error });
      throw new Error(`Failed to create keyring pair: ${error}`);
    }
  }

  /**
   * Get keyring pair by address
   */
  getKeyringPair(address: string): KeyringPair | null {
    try {
      return this.keyring.getPair(address);
    } catch (error) {
      logger.error('Failed to get keyring pair', { error, address });
      return null;
    }
  }

  /**
   * Check if an account is connected
   */
  isAccountConnected(address: string): boolean {
    return this.connectedAccounts.has(address);
  }

  /**
   * Get current provider
   */
  getCurrentProvider(): WalletProvider | null {
    return this.currentProvider;
  }

  /**
   * Validate account address
   */
  validateAddress(address: string): boolean {
    try {
      this.keyring.addFromAddress(address);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Default wallet providers
export class PolkadotJsProvider implements WalletProvider {
  id = 'polkadot-js';
  name = 'Polkadot.js';

  isAvailable(): boolean {
    return typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined' && !!((globalThis as any).window as any).injectedWeb3;
  }

  async connect(): Promise<WalletAccount[]> {
    if (typeof globalThis === 'undefined' || typeof (globalThis as any).window === 'undefined') {
      throw new Error('Polkadot.js provider not available in server environment');
    }

    const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
    
    // Enable the extension
    const extensions = await web3Enable('Polkadot Password Manager');
    if (extensions.length === 0) {
      throw new Error('No Polkadot extensions found');
    }

    // Get accounts
    const accounts = await web3Accounts();
    
    return accounts.map(account => ({
      address: account.address,
      name: account.meta.name || 'Unknown',
      source: account.meta.source,
      isHardware: (account.meta as any).isHardware || false
    }));
  }

  async signMessage(message: string, account: WalletAccount): Promise<string> {
    if (typeof globalThis === 'undefined' || typeof (globalThis as any).window === 'undefined') {
      throw new Error('Polkadot.js provider not available in server environment');
    }

    const { web3FromAddress } = await import('@polkadot/extension-dapp');
    const injector = await web3FromAddress(account.address);
    
    if (!injector.signer) {
      throw new Error('No signer available for account');
    }

    const signature = await injector.signer.signRaw?.({
      address: account.address,
      data: message,
      type: 'bytes'
    });

    if (!signature) {
      throw new Error('Failed to sign message');
    }

    return signature.signature;
  }

  async signTransaction(transaction: any, account: WalletAccount): Promise<string> {
    if (typeof globalThis === 'undefined' || typeof (globalThis as any).window === 'undefined') {
      throw new Error('Polkadot.js provider not available in server environment');
    }

    const { web3FromAddress } = await import('@polkadot/extension-dapp');
    const injector = await web3FromAddress(account.address);
    
    if (!injector.signer) {
      throw new Error('No signer available for account');
    }

    const signature = await injector.signer.signPayload?.(transaction);
    
    if (!signature) {
      throw new Error('Failed to sign transaction');
    }
    
    return signature.signature;
  }

  async disconnect(): Promise<void> {
    // Polkadot.js extension doesn't have a disconnect method
    // The connection is managed by the extension itself
  }
}
