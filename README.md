# Polkadot Password Manager

> 🔐 **Secure password management for the Polkadot ecosystem**

A production-ready password management system designed specifically for Polkadot and Substrate applications, providing secure credential storage, sharing, and verification with enterprise-grade security features.

## Features

* 🔐 **Secure Credential Storage**: Encrypted storage for passwords, API keys, and sensitive data
* 🔄 **Credential Sharing**: Secure sharing of credentials between users and applications
* ✅ **Verification System**: Built-in credential verification and validation
* 🛡️ **Enterprise Security**: Rate limiting, audit logging, and encryption
* 📱 **Multi-Platform**: Works with web, mobile, and desktop applications
* 🔗 **Polkadot Integration**: Seamless integration with Polkadot ecosystem

## Quick Start

### Installation

```bash
npm install @polkadot-auth/password-manager
```

### Basic Usage

```typescript
import { PasswordManager } from '@polkadot-auth/password-manager';

const passwordManager = new PasswordManager({
  encryptionKey: process.env.ENCRYPTION_KEY,
  database: {
    type: 'sqlite',
    path: './data/passwords.db'
  }
});

// Create a new credential
const credential = await passwordManager.createCredential({
  type: 'password',
  name: 'My Wallet Password',
  data: { password: 'secure-password' },
  userId: 'user123'
});

// Retrieve credentials
const credentials = await passwordManager.getUserCredentials('user123');

// Share a credential
const share = await passwordManager.shareCredential({
  credentialId: credential.id,
  recipientId: 'user456',
  permissions: ['read']
});
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

## Security Features

* **End-to-End Encryption**: All credentials are encrypted before storage
* **Audit Logging**: Complete audit trail of all operations
* **Rate Limiting**: Protection against brute force attacks
* **Access Control**: Fine-grained permissions for credential sharing
* **Secure Deletion**: Secure credential revocation and cleanup

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
