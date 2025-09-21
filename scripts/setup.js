#!/usr/bin/env node

/**
 * Quick Setup Script for Polkadot Password Manager
 * This script helps set up the initial configuration
 */

const { writeFileSync, existsSync, readFileSync } = require('fs');
const { execSync } = require('child_process');

console.log('🚀 Setting up Polkadot Password Manager...\n');

// Check if .env exists
if (!existsSync('.env')) {
  console.log('📝 Creating .env file from template...');
  
  const envTemplate = `# Kusama RPC Configuration
KUSAMA_RPC_URL=wss://kusama-rpc.polkadot.io
KUSAMA_CHAIN_ID=kusama
KUSAMA_SS58_FORMAT=2

# Encryption Configuration
ENCRYPTION_KEY=${generateRandomKey(32)}
JWT_SECRET=${generateRandomKey(64)}

# Database Configuration
DATABASE_URL=sqlite:./data/passwords.db
REDIS_URL=redis://localhost:6379

# SSO Integration
SSO_SERVER_URL=http://localhost:3001
SSO_CLIENT_ID=polkadot-password-manager
SSO_CLIENT_SECRET=${generateRandomKey(32)}

# Application Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Wallet Configuration
WALLET_APP_NAME=Polkadot Password Manager
WALLET_SS58_FORMAT=2`;

  writeFileSync('.env', envTemplate);
  console.log('✅ .env file created with secure random keys');
} else {
  console.log('✅ .env file already exists');
}

// Create data directory
if (!existsSync('data')) {
  console.log('📁 Creating data directory...');
  execSync('mkdir -p data', { stdio: 'inherit' });
  console.log('✅ Data directory created');
} else {
  console.log('✅ Data directory already exists');
}

// Create logs directory
if (!existsSync('logs')) {
  console.log('📁 Creating logs directory...');
  execSync('mkdir -p logs', { stdio: 'inherit' });
  console.log('✅ Logs directory created');
} else {
  console.log('✅ Logs directory already exists');
}

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Build the project
console.log('\n🔨 Building the project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Project built successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Run integration test
console.log('\n🧪 Running integration test...');
try {
  execSync('npm run test:integration', { stdio: 'inherit' });
  console.log('✅ Integration test passed');
} catch (error) {
  console.warn('⚠️  Integration test failed (this may be expected if SSO server is not running)');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next Steps:');
console.log('1. Start the SSO server: cd ../polkadot-sso && npm run sso:dev');
console.log('2. Start the password manager: npm start');
console.log('3. Open examples/browser-integration.html in your browser');
console.log('4. Connect your Polkadot.js wallet and test the integration');

console.log('\n📚 Documentation:');
console.log('- Setup Guide: SETUP_GUIDE.md');
console.log('- API Documentation: http://localhost:3000/api-docs');
console.log('- Health Check: http://localhost:3000/health');

function generateRandomKey(length) {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}
