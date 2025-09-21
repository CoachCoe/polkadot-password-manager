#!/usr/bin/env node

/**
 * Deploy Password Manager to Kusama Network
 * This script helps deploy the password manager with proper Kusama configuration
 */

import { PasswordManager } from '../dist/PasswordManager.js';
import { ConfigService } from '../dist/services/configService.js';
import { AuthService } from '../dist/services/authService.js';
import { createLogger } from '../dist/utils/logger.js';

const logger = createLogger('deploy-script');

async function deployToKusama() {
  console.log('🚀 Deploying Polkadot Password Manager to Kusama Network...\n');

  try {
    // Load configuration
    console.log('1. Loading configuration...');
    const config = new ConfigService();
    config.printConfigSummary();

    // Validate Kusama connection
    console.log('\n2. Validating Kusama connection...');
    const passwordManager = new PasswordManager({
      encryptionKey: config.getEncryptionConfig().key,
      database: {
        type: 'sqlite',
        path: './data/passwords.db'
      },
      blockchainConfig: {
        rpcUrl: config.getKusamaConfig().rpcUrl,
        chainId: config.getKusamaConfig().chainId,
        ss58Format: config.getKusamaConfig().ss58Format,
        storagePallet: 'passwordManager',
        storageMethod: 'credentials'
      }
    });

    await passwordManager.initialize();
    console.log('✅ Connected to Kusama network successfully');

    // Initialize authentication service
    console.log('\n3. Initializing authentication service...');
    const authService = new AuthService(config);
    await authService.initialize();
    console.log('✅ Authentication service initialized');

    // Test wallet connection
    console.log('\n4. Testing wallet integration...');
    const walletService = passwordManager.getCredentialService().getWalletService();
    const availableProviders = walletService.getAvailableProviders();
    console.log(`✅ Wallet service configured with ${availableProviders.length} providers`);

    // Test encryption
    console.log('\n5. Testing encryption...');
    const { encryptData, decryptData } = await import('../dist/utils/encryption.js');
    const testData = 'test-password-123';
    const encrypted = encryptData(testData, config.getEncryptionConfig().key);
    const decrypted = decryptData(encrypted, config.getEncryptionConfig().key);
    
    if (decrypted === testData) {
      console.log('✅ Encryption/decryption working correctly');
    } else {
      throw new Error('Encryption test failed');
    }

    // Test SSO connection
    console.log('\n6. Testing SSO connection...');
    const ssoHealthy = await authService.getSSOService().checkHealth();
    if (ssoHealthy) {
      console.log('✅ SSO server connection successful');
    } else {
      console.log('⚠️  SSO server not available (this is expected if not running)');
    }

    // Display deployment summary
    console.log('\n🎉 Deployment completed successfully!');
    console.log('\n📋 Deployment Summary:');
    console.log(`   • Kusama RPC: ${config.getKusamaConfig().rpcUrl}`);
    console.log(`   • Chain ID: ${config.getKusamaConfig().chainId}`);
    console.log(`   • SS58 Format: ${config.getKusamaConfig().ss58Format}`);
    console.log(`   • Database: ${config.getDatabaseConfig().url}`);
    console.log(`   • SSO Server: ${config.getSSOConfig().serverUrl}`);
    console.log(`   • Application Port: ${config.getAppConfig().port}`);

    console.log('\n🔧 Next Steps:');
    console.log('   1. Start the SSO server: npm run sso:dev');
    console.log('   2. Start the password manager: npm start');
    console.log('   3. Open browser and connect your wallet');
    console.log('   4. Test credential storage on Kusama chain');

    console.log('\n📚 Documentation:');
    console.log('   • API Docs: http://localhost:3000/api-docs');
    console.log('   • Health Check: http://localhost:3000/health');
    console.log('   • SSO Health: http://localhost:3001/health');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your Kusama RPC URL is accessible');
    console.log('   2. Verify your encryption key is set');
    console.log('   3. Ensure all dependencies are installed');
    console.log('   4. Check the logs for detailed error information');
    process.exit(1);
  }
}

// Run deployment
deployToKusama().catch(console.error);
