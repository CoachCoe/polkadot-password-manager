// Polkadot Password Manager
// Main entry point for the password management system

// Export main PasswordManager class
export { PasswordManager } from './PasswordManager';

// Export services
export { CredentialService } from './services/credentialService';
export { BlockchainService, DEFAULT_KUSAMA_CONFIG } from './services/blockchainService';
export { WalletService, PolkadotJsProvider } from './services/walletService';
export { SSOService } from './services/ssoService';
export { AuthService } from './services/authService';
export { ConfigService } from './services/configService';

// Export types
export type {
  PasswordManagerOptions,
  DatabaseConfig,
  AuditService,
  CacheService
} from './types';

export type {
  Credential,
  CreateCredentialRequest,
  ShareCredentialRequest,
  VerifyCredentialRequest,
  CredentialType,
  CredentialShare,
  CredentialVerification
} from './types/credential';

// Export utilities
export * from './utils';