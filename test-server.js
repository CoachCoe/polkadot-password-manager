#!/usr/bin/env node

/**
 * Test Server for Polkadot Password Manager
 * This demonstrates the complete integration
 */

import { PasswordManager } from './dist/PasswordManager.js';
import { ConfigService } from './dist/services/configService.js';
import { AuthService } from './dist/services/authService.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const config = new ConfigService();
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

const authService = new AuthService(config);

// Initialize services
async function initializeServices() {
  try {
    console.log('🚀 Initializing Polkadot Password Manager...');
    
    // Initialize password manager
    await passwordManager.initialize();
    console.log('✅ Password manager initialized');
    
    // Initialize auth service
    await authService.initialize();
    console.log('✅ Auth service initialized');
    
    // Print configuration
    config.printConfigSummary();
    
    console.log('🎉 All services initialized successfully!');
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      passwordManager: passwordManager.getCredentialService().isConnected(),
      blockchain: passwordManager.getCredentialService().getBlockchainService().isChainConnected()
    }
  });
});

// Blockchain status endpoint
app.get('/api/credentials/status/blockchain', async (req, res) => {
  try {
    const blockchainService = passwordManager.getCredentialService().getBlockchainService();
    const isConnected = blockchainService.isChainConnected();
    
    if (isConnected) {
      const chainInfo = await blockchainService.getChainInfo();
      res.json({
        connected: true,
        ...chainInfo
      });
    } else {
      res.json({
        connected: false,
        error: 'Not connected to blockchain'
      });
    }
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error.message
    });
  }
});

// Auth challenge endpoint
app.post('/api/auth/challenge', async (req, res) => {
  try {
    const { address, walletType = 'polkadot-js' } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    const challenge = await authService.createAuthChallenge(address, walletType);
    res.json(challenge);
  } catch (error) {
    console.error('Challenge creation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auth status endpoint
app.get('/api/auth/status/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const result = await authService.checkChallengeStatus(challengeId);
    res.json(result);
  } catch (error) {
    console.error('Status check failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auth verify endpoint
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { challengeId, signature } = req.body;
    
    if (!challengeId || !signature) {
      return res.status(400).json({ error: 'Challenge ID and signature are required' });
    }
    
    const session = await authService.verifySignature(challengeId, signature);
    res.json(session);
  } catch (error) {
    console.error('Signature verification failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Credentials endpoints
app.post('/api/credentials', async (req, res) => {
  try {
    const { userAddress, signer, ...credentialData } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address is required' });
    }
    
    // For demo purposes, we'll use a mock signer
    const mockSigner = {
      signRaw: async ({ data }) => ({
        signature: '0x' + '0'.repeat(128) // Mock signature
      })
    };
    
    const credential = await passwordManager.createCredential(
      credentialData,
      userAddress,
      mockSigner
    );
    
    res.json(credential);
  } catch (error) {
    console.error('Credential creation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/credentials/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const credentials = await passwordManager.getUserCredentials(address);
    res.json(credentials);
  } catch (error) {
    console.error('Failed to get credentials:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve the browser demo
app.get('/', (req, res) => {
  res.sendFile('examples/browser-integration.html', { root: '.' });
});

// Start server
async function startServer() {
  await initializeServices();
  
  app.listen(PORT, () => {
    console.log(`\n🌐 Server running at:`);
    console.log(`   • Main: http://localhost:${PORT}`);
    console.log(`   • Health: http://localhost:${PORT}/health`);
    console.log(`   • Blockchain Status: http://localhost:${PORT}/api/credentials/status/blockchain`);
    console.log(`\n🔗 Test the integration:`);
    console.log(`   1. Open http://localhost:${PORT} in your browser`);
    console.log(`   2. Install Polkadot.js extension if needed`);
    console.log(`   3. Connect your wallet and test credential storage`);
    console.log(`\n📚 API Endpoints:`);
    console.log(`   • POST /api/auth/challenge - Create auth challenge`);
    console.log(`   • GET /api/auth/status/:id - Check challenge status`);
    console.log(`   • POST /api/auth/verify - Verify signature`);
    console.log(`   • POST /api/credentials - Create credential`);
    console.log(`   • GET /api/credentials/user/:address - Get user credentials`);
  });
}

startServer().catch(console.error);
