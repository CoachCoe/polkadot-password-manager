import { 
  encryptData, 
  decryptData, 
  hashPassword, 
  verifyPassword 
} from '../../src/utils/encryption';
import { 
  validateString, 
  validatePolkadotAddress, 
  validatePasswordStrength,
  sanitizeHtml
} from '../../src/utils/validation';
import { 
  logAuthSuccess, 
  logAuthFailure, 
  logCredentialAccess 
} from '../../src/utils/audit';

// Mock external dependencies
jest.mock('../../src/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

describe('Security Integration Tests', () => {
  describe('Encryption and Validation Integration', () => {
    it('should encrypt and validate credential data securely', async () => {
      const testData = 'sensitive-credential-data';
      const password = 'test-password-123';

      // Test encryption
      const encrypted = encryptData(testData, password);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);

      // Test decryption
      const decrypted = decryptData(encrypted, password);
      expect(decrypted).toBe(testData);

      // Test with wrong password
      expect(() => {
        decryptData(encrypted, 'wrong-password');
      }).toThrow();
    });

    it('should handle password hashing and verification', () => {
      const password = 'test-password-123';
      
      // Test password hashing
      const hashResult = hashPassword(password);
      expect(hashResult).toBeDefined();
      expect(hashResult.hash).toBeDefined();
      expect(hashResult.salt).toBeDefined();
      expect(hashResult.hash).not.toBe(password);

      // Test password verification
      expect(verifyPassword(password, hashResult.hash, hashResult.salt)).toBe(true);
      expect(verifyPassword('wrong-password', hashResult.hash, hashResult.salt)).toBe(false);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate and sanitize all input types', () => {
      // Test Polkadot address validation
      const validAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const invalidAddress = 'invalid-address';

      const validResult = validatePolkadotAddress(validAddress);
      const invalidResult = validatePolkadotAddress(invalidAddress);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);

      // Test HTML sanitization
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = sanitizeHtml(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should validate password strength comprehensively', () => {
      const weakPassword = 'weak';
      const strongPassword = 'StrongPassword123!@#';

      const weakResult = validatePasswordStrength(weakPassword);
      const strongResult = validatePasswordStrength(strongPassword);

      expect(weakResult.isValid).toBe(false);
      expect(weakResult.score).toBeLessThan(4);
      expect(weakResult.feedback.length).toBeGreaterThan(0);

      expect(strongResult.isValid).toBe(true);
      expect(strongResult.score).toBeGreaterThanOrEqual(4);
      expect(strongResult.entropy).toBeGreaterThan(50);
    });
  });

  describe('Audit Logging Integration', () => {
    it('should log security events throughout the flow', () => {
      const context = { 
        userId: 'user-123', 
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      // These should not throw errors
      expect(() => {
        logAuthSuccess('user-123', 'polkadot-js', context);
        logCredentialAccess('cred-123', 'created', 'user-123', context);
        logAuthFailure('Invalid signature', 'polkadot-js', context);
      }).not.toThrow();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors gracefully with proper logging', async () => {
      // Test validation error handling
      const invalidResult = validatePolkadotAddress('');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBeDefined();

      // Test password strength validation
      const weakPasswordResult = validatePasswordStrength('123');
      expect(weakPasswordResult.isValid).toBe(false);
      expect(weakPasswordResult.feedback.length).toBeGreaterThan(0);

      // Test decryption with invalid data
      expect(() => {
        decryptData('invalid-encrypted-data', 'password');
      }).toThrow();
    });
  });

  describe('Security Configuration Integration', () => {
    it('should apply security configurations correctly', () => {
      // Test encryption configuration
      const testData = 'test-data';
      const password = 'test-password-123';
      
      const encrypted = encryptData(testData, password);
      expect(encrypted).toBeDefined();
      expect(encrypted.length).toBeGreaterThan(0);

      // Test validation configuration
      const addressResult = validatePolkadotAddress('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      expect(addressResult.isValid).toBe(true);

      // Test password strength configuration
      const passwordResult = validatePasswordStrength('StrongPassword123!');
      expect(passwordResult.isValid).toBe(true);
    });
  });
});