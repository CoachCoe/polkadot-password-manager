// Polkadot Password Manager
// Type definitions for the password management system

import type { BlockchainConfig } from './services/blockchainService';

export interface PasswordManagerOptions {
  encryptionKey: string;
  database: DatabaseConfig;
  blockchainConfig?: BlockchainConfig;
  auditService?: AuditService;
  cacheService?: CacheService;
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql' | 'mysql';
  path?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
}

export interface AuditService {
  log(event: string, data?: any): Promise<void>;
  audit(action: string, userId: string, details?: any): Promise<void>;
  getAuditLogs(userId: string, limit?: number): Promise<any[]>;
  cleanupOldAuditLogs(daysToKeep: number): Promise<void>;
}

export interface CacheService {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
