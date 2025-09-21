# Polkadot Password Manager

> 🔐 **Secure password management with Kusama chain storage**

A production-ready password management system that stores encrypted credentials directly on the Kusama blockchain, providing decentralized, secure credential storage with enterprise-grade security features.

## Features

* 🔗 **Kusama Chain Storage**: Encrypted credentials stored directly on Kusama blockchain
* 🔐 **End-to-End Encryption**: AES-256-GCM encryption before blockchain storage
* 💼 **Wallet Integration**: Seamless integration with Polkadot.js and other wallets
* 🔄 **Credential Sharing**: Secure sharing of credentials between users and applications
* ✅ **Verification System**: Built-in credential verification and validation
* 🛡️ **Enterprise Security**: Rate limiting, audit logging, and encryption
* 📱 **Multi-Platform**: Works with web, mobile, and desktop applications
* 🌐 **Decentralized**: No central server required for credential storage

## Quick Start

### Installation

```bash
npm install @polkadot-auth/password-manager
```

### Basic Usage

```typescript
import { PasswordManager } from '@polkadot-auth/password-manager';
import { DEFAULT_KUSAMA_CONFIG } from '@polkadot-auth/password-manager/services/blockchainService';

// Initialize the password manager with Kusama integration
const passwordManager = new PasswordManager({
  encryptionKey: process.env.ENCRYPTION_KEY,
  database: {
    type: 'sqlite',
    path: './data/passwords.db'
  },
  blockchainConfig: {
    ...DEFAULT_KUSAMA_CONFIG,
    rpcUrl: 'wss://kusama-rpc.polkadot.io'
  }
});

// Connect to Kusama chain
await passwordManager.initialize();

// Set up wallet (in browser environment)
const walletService = passwordManager.getCredentialService().getWalletService();
const accounts = await walletService.connect('polkadot-js');

// Create a new credential and store it on Kusama chain
const credential = await passwordManager.createCredential({
  credential_type_id: 'password',
  credential_data: { 
    username: 'user@example.com',
    password: 'secure-password',
    website: 'https://example.com'
  },
  expires_at: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
}, accounts[0].address, accounts[0]);

// Retrieve credentials from Kusama chain
const credentials = await passwordManager.getUserCredentials(accounts[0].address);

// Decrypt credential data
const decryptedData = await passwordManager.getCredentialService()
  .decryptCredentialData(credentials[0]);
```

## API Reference

### PasswordManager

The main class for managing passwords and credentials.

#### Constructor Options

```typescript
interface PasswordManagerOptions {
  encryptionKey: string;
  database: DatabaseConfig;
  auditService?: AuditService;
  cacheService?: CacheService;
}
```

#### Methods

- `createCredential(request: CreateCredentialRequest): Promise<Credential>`
- `getUserCredentials(userId: string): Promise<Credential[]>`
- `shareCredential(request: ShareCredentialRequest): Promise<CredentialShare>`
- `verifyCredential(request: VerifyCredentialRequest): Promise<CredentialVerification>`
- `revokeCredential(credentialId: string): Promise<void>`

## Kusama Chain Integration

### How It Works

1. **Encryption**: Credentials are encrypted using AES-256-GCM before being stored
2. **Blockchain Storage**: Encrypted data is stored directly on the Kusama blockchain
3. **Wallet Integration**: Users sign transactions with their Polkadot wallets
4. **Decentralized Access**: Credentials can be accessed from anywhere with the user's wallet

### Supported Networks

* **Kusama**: Primary network for credential storage
* **Polkadot**: Can be configured for Polkadot mainnet
* **Custom Parachains**: Supports any Substrate-based chain

### Environment Variables

```bash
# Required
ENCRYPTION_KEY=your-32-character-encryption-key

# Optional - uses defaults if not provided
KUSAMA_RPC_URL=wss://kusama-rpc.polkadot.io
POLKADOT_RPC_URL=wss://rpc.polkadot.io
```

## 🔒 Security Features

### **Encryption & Cryptography**
- **AES-256-GCM** authenticated encryption for all stored data
- **PBKDF2** key derivation with 100,000 iterations
- **Cryptographically secure** random number generation
- **Timing-safe** password verification
- **Salt-based** password hashing

### **Authentication & Authorization**
- **Polkadot wallet integration** (Polkadot.js, Talisman, SubWallet, Nova)
- **SSO integration** with polkadot-sso server
- **JWT-based** session management
- **Multi-factor authentication** support
- **Session invalidation** and cleanup

### **Security Monitoring**
- **Comprehensive audit logging** for all security events
- **Real-time threat detection** and alerting
- **Rate limiting** and DDoS protection
- **Input validation** and sanitization
- **XSS and injection** attack prevention

### **Compliance & Standards**
- **OWASP Top 10** security compliance
- **Enterprise security** best practices
- **Data privacy** protection
- **Audit trail** maintenance

### **Traditional Security Features**
- **End-to-End Encryption**: All credentials are encrypted before blockchain storage
- **Decentralized Storage**: No central server can access your credentials
- **Wallet-Based Access**: Only you can access your credentials with your wallet
- **Audit Logging**: Complete audit trail of all operations
- **Rate Limiting**: Protection against brute force attacks
- **Access Control**: Fine-grained permissions for credential sharing
- **Secure Deletion**: Secure credential revocation and cleanup

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run in development mode
npm run dev
```

## License

MIT License

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## Support

For support and questions, please open an issue on our GitHub repository.
