// Polkadot Password Manager
// Configuration service for managing environment variables and settings

import { createLogger } from '../utils/logger';

const logger = createLogger('config-service');

export interface AppConfig {
  // Kusama Configuration
  kusama: {
    rpcUrl: string;
    chainId: string;
    ss58Format: number;
  };
  
  // Encryption Configuration
  encryption: {
    key: string;
    algorithm: string;
  };
  
  // Database Configuration
  database: {
    url: string;
    redisUrl?: string;
  };
  
  // SSO Configuration
  sso: {
    serverUrl: string;
    clientId: string;
    clientSecret: string;
  };
  
  // Application Configuration
  app: {
    port: number;
    nodeEnv: string;
    corsOrigin: string;
  };
  
  // Wallet Configuration
  wallet: {
    appName: string;
    ss58Format: number;
  };
}

export class ConfigService {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): AppConfig {
    logger.info('Loading application configuration');

    return {
      kusama: {
        rpcUrl: process.env['KUSAMA_RPC_URL'] || 'wss://kusama-rpc.polkadot.io',
        chainId: process.env['KUSAMA_CHAIN_ID'] || 'kusama',
        ss58Format: parseInt(process.env['KUSAMA_SS58_FORMAT'] || '2'),
      },
      
      encryption: {
        key: process.env['ENCRYPTION_KEY'] || this.generateEncryptionKey(),
        algorithm: 'aes-256-cbc',
      },
      
      database: {
        url: process.env['DATABASE_URL'] || 'sqlite:./data/passwords.db',
        ...(process.env['REDIS_URL'] && { redisUrl: process.env['REDIS_URL'] }),
      },
      
      sso: {
        serverUrl: process.env['SSO_SERVER_URL'] || 'http://localhost:3001',
        clientId: process.env['SSO_CLIENT_ID'] || 'polkadot-password-manager',
        clientSecret: process.env['SSO_CLIENT_SECRET'] || this.generateClientSecret(),
      },
      
      app: {
        port: parseInt(process.env['PORT'] || '3000'),
        nodeEnv: process.env['NODE_ENV'] || 'development',
        corsOrigin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
      },
      
      wallet: {
        appName: process.env['WALLET_APP_NAME'] || 'Polkadot Password Manager',
        ss58Format: parseInt(process.env['WALLET_SS58_FORMAT'] || '2'),
      },
    };
  }

  private validateConfig(): void {
    logger.info('Validating application configuration');

    const errors: string[] = [];

    // Validate encryption key
    if (this.config.encryption.key.length < 32) {
      errors.push('ENCRYPTION_KEY must be at least 32 characters long');
    }

    // Validate Kusama RPC URL
    if (!this.config.kusama.rpcUrl.startsWith('wss://') && !this.config.kusama.rpcUrl.startsWith('ws://')) {
      errors.push('KUSAMA_RPC_URL must be a valid WebSocket URL (wss:// or ws://)');
    }

    // Validate SSO configuration
    if (!this.config.sso.serverUrl.startsWith('http://') && !this.config.sso.serverUrl.startsWith('https://')) {
      errors.push('SSO_SERVER_URL must be a valid HTTP URL');
    }

    // Validate port
    if (this.config.app.port < 1 || this.config.app.port > 65535) {
      errors.push('PORT must be a valid port number (1-65535)');
    }

    if (errors.length > 0) {
      logger.error('Configuration validation failed', { errors });
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    logger.info('Configuration validation passed');
  }

  private generateEncryptionKey(): string {
    const crypto = require('crypto');
    const key = crypto.randomBytes(32).toString('hex');
    logger.warn('Generated random encryption key. Set ENCRYPTION_KEY environment variable for production!');
    return key;
  }

  private generateClientSecret(): string {
    const crypto = require('crypto');
    const secret = crypto.randomBytes(32).toString('hex');
    logger.warn('Generated random SSO client secret. Set SSO_CLIENT_SECRET environment variable for production!');
    return secret;
  }

  getConfig(): AppConfig {
    return this.config;
  }

  getKusamaConfig() {
    return this.config.kusama;
  }

  getEncryptionConfig() {
    return this.config.encryption;
  }

  getDatabaseConfig() {
    return this.config.database;
  }

  getSSOConfig() {
    return this.config.sso;
  }

  getAppConfig() {
    return this.config.app;
  }

  getWalletConfig() {
    return this.config.wallet;
  }

  isDevelopment(): boolean {
    return this.config.app.nodeEnv === 'development';
  }

  isProduction(): boolean {
    return this.config.app.nodeEnv === 'production';
  }

  /**
   * Print configuration summary (without sensitive data)
   */
  printConfigSummary(): void {
    logger.info('Application Configuration Summary', {
      kusama: {
        rpcUrl: this.config.kusama.rpcUrl,
        chainId: this.config.kusama.chainId,
        ss58Format: this.config.kusama.ss58Format,
      },
      database: {
        url: this.config.database.url,
        hasRedis: !!this.config.database.redisUrl,
      },
      sso: {
        serverUrl: this.config.sso.serverUrl,
        clientId: this.config.sso.clientId,
        hasClientSecret: !!this.config.sso.clientSecret,
      },
      app: {
        port: this.config.app.port,
        nodeEnv: this.config.app.nodeEnv,
        corsOrigin: this.config.app.corsOrigin,
      },
      wallet: {
        appName: this.config.wallet.appName,
        ss58Format: this.config.wallet.ss58Format,
      },
    });
  }
}
