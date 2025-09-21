import { SSOService } from '../../src/services/ssoService';
import { ErrorCode, ErrorSeverity } from '../../src/utils/errors';

// Mock fetch
global.fetch = jest.fn();

describe('SSO Service', () => {
  let ssoService: SSOService;
  const mockConfig = {
    serverUrl: 'http://localhost:3001',
    clientId: 'test-client',
    clientSecret: 'test-secret'
  };

  beforeEach(() => {
    ssoService = new SSOService(mockConfig);
    jest.clearAllMocks();
  });

  describe('createChallenge', () => {
    it('should create challenge successfully', async () => {
      const mockHtml = `
        <html>
          <script>
            window.CHALLENGE_DATA = {
              challengeId: "test-challenge-123",
              message: "Please sign this message to authenticate"
            };
          </script>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml)
      });

      const result = await ssoService.createChallenge('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');

      expect(result.challengeId).toBe('test-challenge-123');
      expect(result.message).toBe('Please sign this message to authenticate');
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should validate Polkadot address format', async () => {
      await expect(
        ssoService.createChallenge('invalid-address')
      ).rejects.toThrow('Invalid Polkadot address format');
    });

    it('should validate wallet type', async () => {
      await expect(
        ssoService.createChallenge('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', 'invalid@type')
      ).rejects.toThrow('Invalid wallet type');
    });

    it('should handle SSO server errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(
        ssoService.createChallenge('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
      ).rejects.toThrow('SSO challenge creation failed: 500 Internal Server Error');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        ssoService.createChallenge('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
      ).rejects.toThrow('Network error');
    });

    it('should handle malformed HTML response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html><body>No challenge data</body></html>')
      });

      await expect(
        ssoService.createChallenge('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
      ).rejects.toThrow('Failed to extract challenge data from SSO response');
    });

    it('should handle oversized response', async () => {
      const largeHtml = 'x'.repeat(2000000); // 2MB
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(largeHtml)
      });

      await expect(
        ssoService.createChallenge('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
      ).rejects.toThrow('SSO response too large');
    });
  });

  describe('checkChallengeStatus', () => {
    it('should check challenge status successfully', async () => {
      const mockResponse = {
        status: 'pending',
        message: 'Challenge is pending'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await ssoService.checkChallengeStatus('test-challenge-123');

      expect(result.status).toBe('pending');
      expect(result.message).toBe('Challenge is pending');
    });

    it('should handle challenge with session', async () => {
      const mockResponse = {
        status: 'completed',
        session: {
          sessionId: 'session-123',
          userId: 'user-123',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          walletType: 'polkadot-js',
          expiresAt: Date.now() + 3600000,
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await ssoService.checkChallengeStatus('test-challenge-123');

      expect(result.status).toBe('completed');
      expect(result.session).toBeDefined();
      expect(result.session?.sessionId).toBe('session-123');
    });

    it('should handle SSO server errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(
        ssoService.checkChallengeStatus('invalid-challenge')
      ).rejects.toThrow('SSO challenge status check failed: Not Found');
    });
  });

  describe('verifySignature', () => {
    it('should verify signature successfully', async () => {
      const mockSession = {
        sessionId: 'session-123',
        userId: 'user-123',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        walletType: 'polkadot-js',
        expiresAt: Date.now() + 3600000,
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSession)
      });

      const result = await ssoService.verifySignature('test-challenge-123', 'signature-data');

      expect(result.sessionId).toBe('session-123');
      expect(result.address).toBe('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
    });

    it('should handle verification errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      await expect(
        ssoService.verifySignature('test-challenge-123', 'invalid-signature')
      ).rejects.toThrow('SSO signature verification failed: Bad Request');
    });
  });

  describe('getSession', () => {
    it('should get session successfully', async () => {
      const mockSession = {
        sessionId: 'session-123',
        userId: 'user-123',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        walletType: 'polkadot-js',
        expiresAt: Date.now() + 3600000,
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSession)
      });

      const result = await ssoService.getSession('session-123');

      expect(result).toEqual(mockSession);
    });

    it('should return null for non-existent session', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 404
      });

      const result = await ssoService.getSession('non-existent-session');

      expect(result).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      await expect(ssoService.signOut('session-123')).resolves.not.toThrow();
    });

    it('should handle sign out errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(
        ssoService.signOut('session-123')
      ).rejects.toThrow('SSO sign out failed: Internal Server Error');
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const mockSession = {
        sessionId: 'new-session-123',
        userId: 'user-123',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        walletType: 'polkadot-js',
        expiresAt: Date.now() + 3600000,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSession)
      });

      const result = await ssoService.refreshSession('refresh-token');

      expect(result.sessionId).toBe('new-session-123');
      expect(result.accessToken).toBe('new-access-token');
    });

    it('should handle refresh errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(
        ssoService.refreshSession('invalid-refresh-token')
      ).rejects.toThrow('SSO session refresh failed: Unauthorized');
    });
  });

  describe('checkHealth', () => {
    it('should return true for healthy server', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      });

      const result = await ssoService.checkHealth();

      expect(result).toBe(true);
    });

    it('should return false for unhealthy server', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false
      });

      const result = await ssoService.checkHealth();

      expect(result).toBe(false);
    });

    it('should return false for network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await ssoService.checkHealth();

      expect(result).toBe(false);
    });
  });
});
