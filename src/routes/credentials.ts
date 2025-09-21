import { Router } from 'express';
import { CredentialService } from '../services/credentialService.js';

export const createCredentialRouter = (credentialService: CredentialService) => {
  const router = Router();

  // Create credential
  router.post('/', async (req, res) => {
    try {
      const { userAddress, signer, ...requestData } = req.body;
      
      if (!userAddress) {
        res.status(400).json({ error: 'User address is required' });
        return;
      }

      const credential = await credentialService.createCredential(requestData, userAddress, signer);
      res.json(credential);
    } catch (error) {
      console.error('Failed to create credential:', error);
      res.status(500).json({ error: 'Failed to create credential' });
    }
  });

  // Get credential
  router.get('/:id', async (req, res) => {
    try {
      const { userAddress } = req.query;
      
      if (!userAddress) {
        res.status(400).json({ error: 'User address is required' });
        return;
      }

      const credential = await credentialService.getCredential(req.params.id, userAddress as string);
      
      if (!credential) {
        res.status(404).json({ error: 'Credential not found' });
        return;
      }

      res.json(credential);
    } catch (error) {
      console.error('Failed to get credential:', error);
      res.status(500).json({ error: 'Failed to get credential' });
    }
  });

  // Get user credentials
  router.get('/user/:userAddress', async (req, res) => {
    try {
      const credentials = await credentialService.getUserCredentials(req.params.userAddress);
      res.json(credentials);
    } catch (error) {
      console.error('Failed to get user credentials:', error);
      res.status(500).json({ error: 'Failed to get user credentials' });
    }
  });

  // Decrypt credential data
  router.post('/:id/decrypt', async (req, res) => {
    try {
      const { userAddress } = req.body;
      
      if (!userAddress) {
        res.status(400).json({ error: 'User address is required' });
        return;
      }

      const credential = await credentialService.getCredential(req.params.id, userAddress);
      
      if (!credential) {
        res.status(404).json({ error: 'Credential not found' });
        return;
      }

      const decryptedData = await credentialService.decryptCredentialData(credential);
      res.json(decryptedData);
    } catch (error) {
      console.error('Failed to decrypt credential:', error);
      res.status(500).json({ error: 'Failed to decrypt credential' });
    }
  });

  // Revoke credential
  router.delete('/:id', async (req, res) => {
    try {
      const { userAddress, signer } = req.body;
      
      if (!userAddress) {
        res.status(400).json({ error: 'User address is required' });
        return;
      }

      await credentialService.revokeCredential(req.params.id, userAddress, signer);
      res.json({ message: 'Credential revoked successfully' });
    } catch (error) {
      console.error('Failed to revoke credential:', error);
      res.status(500).json({ error: 'Failed to revoke credential' });
    }
  });

  // Get blockchain status
  router.get('/status/blockchain', async (_req, res) => {
    try {
      const isConnected = credentialService.isConnected();
      const blockchainService = credentialService.getBlockchainService();
      
      if (isConnected) {
        const chainInfo = await blockchainService.getChainInfo();
        res.json({ 
          connected: true, 
          chain: chainInfo.chain,
          version: chainInfo.version,
          blockNumber: chainInfo.blockNumber
        });
      } else {
        res.json({ connected: false });
      }
    } catch (error) {
      console.error('Failed to get blockchain status:', error);
      res.status(500).json({ error: 'Failed to get blockchain status' });
    }
  });

  return router;
};
