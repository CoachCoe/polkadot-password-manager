# 🚀 Complete Setup Guide for Polkadot Password Manager

This guide will help you set up the complete integration with Kusama RPC, SSO authentication, and browser wallet connections.

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Polkadot.js browser extension
- Access to Kusama RPC endpoint
- [polkadot-sso](https://github.com/CoachCoe/polkadot-sso) repository

## 🔧 Step 1: Environment Configuration

### 1.1 Copy Environment Template

```bash
cp env.example .env
```

### 1.2 Configure Environment Variables

Edit `.env` with your settings:

```bash
# Kusama RPC Configuration
KUSAMA_RPC_URL=wss://kusama-rpc.polkadot.io
KUSAMA_CHAIN_ID=kusama
KUSAMA_SS58_FORMAT=2

# Encryption Configuration (IMPORTANT: Generate a secure key!)
ENCRYPTION_KEY=your-32-character-encryption-key-here
JWT_SECRET=your-jwt-secret-for-sessions

# Database Configuration
DATABASE_URL=sqlite:./data/passwords.db
REDIS_URL=redis://localhost:6379

# SSO Integration
SSO_SERVER_URL=http://localhost:3001
SSO_CLIENT_ID=polkadot-password-manager
SSO_CLIENT_SECRET=your-sso-client-secret

# Application Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Wallet Configuration
WALLET_APP_NAME=Polkadot Password Manager
WALLET_SS58_FORMAT=2
```

### 1.3 Generate Secure Keys

```bash
# Generate encryption key (32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate SSO client secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🏗️ Step 2: Install Dependencies

```bash
# Install password manager dependencies
npm install

# Install dotenv for environment variables
npm install dotenv
```

## 🔗 Step 3: Set Up SSO Server

### 3.1 Clone and Setup polkadot-sso

```bash
# Clone the SSO repository
git clone https://github.com/CoachCoe/polkadot-sso.git
cd polkadot-sso

# Install dependencies
npm install

# Build the packages
npm run build
```

### 3.2 Configure SSO Server

Create `polkadot-sso/.env`:

```bash
PORT=3001
NODE_ENV=development
JWT_SECRET=your-jwt-secret-for-sessions
DATABASE_URL=sqlite:./data/sso.db
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000
```

### 3.3 Start SSO Server

```bash
# In the polkadot-sso directory
npm run sso:dev
```

## 🚀 Step 4: Deploy to Kusama

### 4.1 Build the Password Manager

```bash
# In the password-manager directory
npm run build
```

### 4.2 Deploy to Kusama Network

```bash
npm run deploy:kusama
```

This will:
- ✅ Validate Kusama RPC connection
- ✅ Test encryption/decryption
- ✅ Initialize authentication services
- ✅ Verify wallet integration
- ✅ Check SSO connectivity

## 🌐 Step 5: Browser Integration

### 5.1 Install Polkadot.js Extension

1. Install [Polkadot.js Extension](https://polkadot.js.org/extension/) in your browser
2. Create or import a Kusama account
3. Note your account address

### 5.2 Start the Password Manager

```bash
npm start
```

### 5.3 Open Browser Demo

Open `examples/browser-integration.html` in your browser or visit:
```
http://localhost:3000
```

## 🔐 Step 6: Test the Complete Flow

### 6.1 Connect Wallet

1. Click "Connect Wallet" in the browser
2. Select your Kusama account
3. Sign the authentication message
4. Verify successful connection

### 6.2 Create Credentials

1. Fill out the credential form
2. Click "Create Credential"
3. The credential will be encrypted and stored on Kusama chain

### 6.3 View Credentials

1. Click "Load Credentials"
2. View your stored credentials
3. Credentials are decrypted client-side

## 🧪 Step 7: Run Integration Tests

```bash
# Test core functionality
npm run test:integration

# Test with real wallet (requires browser)
npm run browser:demo
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Kusama RPC Connection Failed
```bash
# Check if RPC URL is accessible
curl -H "Content-Type: application/json" \
  -d '{"id":1, "jsonrpc":"2.0", "method": "system_chain", "params":[]}' \
  https://kusama-rpc.polkadot.io
```

#### 2. SSO Server Not Available
```bash
# Check SSO server health
curl http://localhost:3001/health
```

#### 3. Wallet Extension Not Found
- Ensure Polkadot.js extension is installed
- Refresh the browser page
- Check browser console for errors

#### 4. Encryption Key Issues
```bash
# Verify encryption key length
node -e "console.log(process.env.ENCRYPTION_KEY?.length)"
# Should output 64 (32 bytes in hex)
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm start
```

## 📊 Monitoring

### Health Checks

- **Password Manager**: `http://localhost:3000/health`
- **SSO Server**: `http://localhost:3001/health`
- **Blockchain Status**: `http://localhost:3000/api/credentials/status/blockchain`

### Logs

```bash
# View application logs
tail -f logs/password-manager.log

# View SSO logs
tail -f ../polkadot-sso/logs/sso.log
```

## 🚀 Production Deployment

### 1. Environment Setup

```bash
NODE_ENV=production
KUSAMA_RPC_URL=wss://your-production-kusama-rpc
ENCRYPTION_KEY=your-production-encryption-key
JWT_SECRET=your-production-jwt-secret
```

### 2. Database Setup

```bash
# Use PostgreSQL for production
DATABASE_URL=postgresql://user:password@localhost:5432/password_manager
REDIS_URL=redis://your-redis-server:6379
```

### 3. Security Considerations

- ✅ Use HTTPS in production
- ✅ Set secure CORS origins
- ✅ Use strong encryption keys
- ✅ Enable rate limiting
- ✅ Set up monitoring and alerts

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/challenge` - Create authentication challenge
- `GET /api/auth/status/:challengeId` - Check challenge status
- `POST /api/auth/verify` - Verify signature and create session
- `POST /api/auth/signout` - Sign out and destroy session

### Credential Endpoints

- `POST /api/credentials` - Create new credential
- `GET /api/credentials/:id` - Get specific credential
- `GET /api/credentials/user/:address` - Get user credentials
- `POST /api/credentials/:id/decrypt` - Decrypt credential data
- `DELETE /api/credentials/:id` - Revoke credential

### Status Endpoints

- `GET /health` - Application health check
- `GET /api/credentials/status/blockchain` - Blockchain status

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Verify all environment variables are set correctly
4. Ensure all services are running and accessible
5. Open an issue on the GitHub repository

## 🎉 Success!

Once everything is set up, you should have:

- ✅ Password Manager running on Kusama network
- ✅ SSO authentication working
- ✅ Browser wallet integration
- ✅ Secure credential storage on blockchain
- ✅ Complete end-to-end encryption

Your Polkadot Password Manager is now ready for production use! 🚀
