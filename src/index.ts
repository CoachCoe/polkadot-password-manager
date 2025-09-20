// Polkadot Password Manager
// Main entry point for the password management system

// Export all credential management functionality
export * from './credentials';

// Export main PasswordManager class
export { PasswordManager } from './PasswordManager';

// Export types
export type {
  PasswordManagerOptions,
  DatabaseConfig,
  AuditService,
  CacheService
} from './types';

// Export utilities
export * from './utils';