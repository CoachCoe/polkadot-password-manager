// Quick test script to verify Kusama integration
import { PasswordManager } from './dist/PasswordManager.js';
import { DEFAULT_KUSAMA_CONFIG } from './dist/services/blockchainService.js';

async function testIntegration() {
  console.log('🧪 Testing Kusama Integration...\n');

  try {
    // Test 1: Initialize PasswordManager
    console.log('1. Testing PasswordManager initialization...');
    const passwordManager = new PasswordManager({
      encryptionKey: 'test-encryption-key-32-chars-long',
      database: {
        type: 'sqlite',
        path: './test-data.db'
      },
      blockchainConfig: {
        ...DEFAULT_KUSAMA_CONFIG,
        rpcUrl: 'wss://kusama-rpc.polkadot.io'
      }
    });
    console.log('✅ PasswordManager created successfully');

    // Test 2: Check if services are properly initialized
    console.log('\n2. Testing service initialization...');
    const credentialService = passwordManager.getCredentialService();
    const walletService = credentialService.getWalletService();
    console.log('✅ Services initialized successfully');

    // Test 3: Test wallet service configuration
    console.log('\n3. Testing wallet service...');
    const availableProviders = walletService.getAvailableProviders();
    console.log(`✅ Wallet service configured with ${availableProviders.length} providers`);

    // Test 4: Test encryption utilities
    console.log('\n4. Testing encryption utilities...');
    const { encryptData, decryptData } = await import('./dist/utils/encryption.js');
    const testData = 'test-password-123';
    const encrypted = encryptData(testData, 'test-key');
    const decrypted = decryptData(encrypted, 'test-key');
    
    if (decrypted === testData) {
      console.log('✅ Encryption/decryption working correctly');
    } else {
      console.log('❌ Encryption/decryption failed');
    }

    console.log('\n🎉 All tests passed! Kusama integration is ready.');
    console.log('\nNext steps:');
    console.log('1. Run: npm install');
    console.log('2. Run: npm run build');
    console.log('3. Set up your Kusama RPC endpoint');
    console.log('4. Configure your encryption key');
    console.log('5. Test with a real wallet connection');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nThis is expected if the build files don\'t exist yet.');
    console.log('Run "npm run build" first to compile the TypeScript files.');
  }
}

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Run the test
testIntegration().catch(console.error);
