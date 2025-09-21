// Polkadot Password Manager
// Example usage of Kusama chain integration

import { PasswordManager } from '../src/PasswordManager';
import { DEFAULT_KUSAMA_CONFIG } from '../src/services/blockchainService';
import { WalletService, PolkadotJsProvider } from '../src/services/walletService';
import { Keyring } from '@polkadot/keyring';

async function demonstrateKusamaIntegration() {
  console.log('🔐 Polkadot Password Manager - Kusama Integration Demo');
  console.log('=====================================================\n');

  try {
    // 1. Initialize the Password Manager
    console.log('1. Initializing Password Manager...');
    const passwordManager = new PasswordManager({
      encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key-here',
      database: {
        type: 'sqlite',
        path: './data/passwords.db'
      },
      blockchainConfig: {
        ...DEFAULT_KUSAMA_CONFIG,
        rpcUrl: process.env.KUSAMA_RPC_URL || 'wss://kusama-rpc.polkadot.io'
      }
    });

    // Initialize and connect to Kusama
    await passwordManager.initialize();
    console.log('✅ Password Manager initialized and connected to Kusama chain\n');

    // 2. Set up wallet service
    console.log('2. Setting up wallet service...');
    const credentialService = passwordManager.getCredentialService();
    const walletService = credentialService.getWalletService();
    
    // Register Polkadot.js provider
    const polkadotProvider = new PolkadotJsProvider();
    walletService.registerProvider(polkadotProvider);
    console.log('✅ Wallet service configured\n');

    // 3. Connect to wallet (in browser environment)
    console.log('3. Connecting to wallet...');
    try {
      const accounts = await walletService.connect('polkadot-js');
      console.log(`✅ Connected to wallet with ${accounts.length} accounts`);
      console.log('Available accounts:', accounts.map(acc => ({ address: acc.address, name: acc.name })));
    } catch (error) {
      console.log('⚠️  Wallet connection failed (expected in Node.js environment)');
      console.log('   In browser, this would connect to Polkadot.js extension\n');
      
      // For demo purposes, create a test keyring pair
      const keyring = new Keyring({ type: 'sr25519', ss58Format: 2 });
      const testPair = keyring.addFromMnemonic('//Alice'); // Test account
      console.log('   Using test account for demo:', testPair.address);
    }

    // 4. Create a credential
    console.log('\n4. Creating a credential...');
    const testPair = new Keyring({ type: 'sr25519', ss58Format: 2 }).addFromMnemonic('//Alice');
    
    const credentialRequest = {
      credential_type_id: 'password',
      credential_data: {
        username: 'testuser',
        password: 'securepassword123',
        website: 'https://example.com',
        notes: 'Test credential for Kusama integration'
      },
      expires_at: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year from now
      metadata: {
        category: 'web',
        priority: 'high'
      }
    };

    const credential = await credentialService.createCredential(
      credentialRequest,
      testPair.address,
      testPair
    );
    
    console.log('✅ Credential created and stored on Kusama chain');
    console.log('   Credential ID:', credential.id);
    console.log('   Block Number:', credential.created_at);
    console.log('   Encrypted Data Length:', credential.credential_data.length);

    // 5. Retrieve the credential
    console.log('\n5. Retrieving the credential...');
    const retrievedCredential = await credentialService.getCredential(
      credential.id,
      testPair.address
    );
    
    if (retrievedCredential) {
      console.log('✅ Credential retrieved from Kusama chain');
      console.log('   Credential ID:', retrievedCredential.id);
      console.log('   Status:', retrievedCredential.status);
      
      // Decrypt the data
      const decryptedData = await credentialService.decryptCredentialData(retrievedCredential);
      console.log('   Decrypted Data:', {
        username: decryptedData.username,
        website: decryptedData.website,
        notes: decryptedData.notes
        // Note: password is not logged for security
      });
    }

    // 6. Get all user credentials
    console.log('\n6. Retrieving all user credentials...');
    const userCredentials = await credentialService.getUserCredentials(testPair.address);
    console.log(`✅ Retrieved ${userCredentials.length} credentials for user`);

    // 7. Check blockchain status
    console.log('\n7. Checking blockchain status...');
    const isConnected = credentialService.isConnected();
    if (isConnected) {
      const blockchainService = credentialService.getBlockchainService();
      const chainInfo = await blockchainService.getChainInfo();
      console.log('✅ Connected to Kusama chain');
      console.log('   Chain:', chainInfo.chain);
      console.log('   Version:', chainInfo.version);
      console.log('   Current Block:', chainInfo.blockNumber);
    }

    // 8. Revoke credential (optional)
    console.log('\n8. Revoking credential...');
    await credentialService.revokeCredential(credential.id, testPair.address, testPair);
    console.log('✅ Credential revoked on Kusama chain');

    console.log('\n🎉 Kusama integration demo completed successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('• ✅ Connection to Kusama chain');
    console.log('• ✅ Encrypted credential storage on-chain');
    console.log('• ✅ Credential retrieval from chain');
    console.log('• ✅ Data decryption');
    console.log('• ✅ Credential revocation');
    console.log('• ✅ Blockchain status monitoring');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    console.log('\nTroubleshooting:');
    console.log('• Ensure Kusama RPC endpoint is accessible');
    console.log('• Check that encryption key is set');
    console.log('• Verify network connectivity');
  } finally {
    // Clean up
    try {
      const credentialService = passwordManager.getCredentialService();
      await credentialService.disconnect();
      console.log('\n🔌 Disconnected from Kusama chain');
    } catch (error) {
      console.log('⚠️  Error during cleanup:', error);
    }
  }
}

// Environment setup
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  
  // Run the demo
  demonstrateKusamaIntegration().catch(console.error);
}

export { demonstrateKusamaIntegration };
