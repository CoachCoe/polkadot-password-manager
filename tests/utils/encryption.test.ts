import {
  encryptData,
  decryptData,
  generateEncryptionKey,
  hashPassword,
  verifyPassword,
  generateSecureRandom,
  createSecureHash
} from '../../src/utils/encryption';

describe('Encryption Utilities', () => {
  const testPassword = 'test-password-123';
  const testData = 'sensitive-data-to-encrypt';

  describe('encryptData and decryptData', () => {
    it('should encrypt and decrypt data correctly', () => {
      const encrypted = encryptData(testData, testPassword);
      const decrypted = decryptData(encrypted, testPassword);

      expect(decrypted).toBe(testData);
      expect(encrypted).not.toBe(testData);
      expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/); // Valid base64 string
    });

    it('should produce different encrypted data for same input', () => {
      const encrypted1 = encryptData(testData, testPassword);
      const encrypted2 = encryptData(testData, testPassword);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should fail to decrypt with wrong password', () => {
      const encrypted = encryptData(testData, testPassword);
      
      expect(() => {
        decryptData(encrypted, 'wrong-password');
      }).toThrow('Failed to decrypt data');
    });

    it('should fail to decrypt corrupted data', () => {
      expect(() => {
        decryptData('corrupted-data', testPassword);
      }).toThrow('Failed to decrypt data');
    });

    it('should handle empty string', () => {
      const encrypted = encryptData('', testPassword);
      const decrypted = decryptData(encrypted, testPassword);

      expect(decrypted).toBe('');
    });

    it('should handle special characters', () => {
      const specialData = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptData(specialData, testPassword);
      const decrypted = decryptData(encrypted, testPassword);

      expect(decrypted).toBe(specialData);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateEncryptionKey();
      
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate different keys each time', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('should hash password and verify correctly', () => {
      const { hash, salt } = hashPassword(testPassword);
      
      expect(hash).toBeDefined();
      expect(salt).toBeDefined();
      expect(hash).toHaveLength(64);
      expect(salt).toHaveLength(64);

      const isValid = verifyPassword(testPassword, hash, salt);
      expect(isValid).toBe(true);
    });

    it('should reject wrong password', () => {
      const { hash, salt } = hashPassword(testPassword);
      const isValid = verifyPassword('wrong-password', hash, salt);
      
      expect(isValid).toBe(false);
    });

    it('should produce different hashes for same password', () => {
      const { hash: hash1, salt: salt1 } = hashPassword(testPassword);
      const { hash: hash2, salt: salt2 } = hashPassword(testPassword);

      expect(hash1).not.toBe(hash2);
      expect(salt1).not.toBe(salt2);
    });

    it('should work with provided salt', () => {
      const providedSalt = 'a'.repeat(64);
      const { hash, salt } = hashPassword(testPassword, providedSalt);

      expect(salt).toBe(providedSalt);
      expect(verifyPassword(testPassword, hash, salt)).toBe(true);
    });
  });

  describe('generateSecureRandom', () => {
    it('should generate random string of specified length', () => {
      const random = generateSecureRandom(32);
      
      expect(random).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(random).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate different strings each time', () => {
      const random1 = generateSecureRandom(16);
      const random2 = generateSecureRandom(16);

      expect(random1).not.toBe(random2);
    });

    it('should use default length when not specified', () => {
      const random = generateSecureRandom();
      
      expect(random).toHaveLength(64); // 32 bytes default
    });
  });

  describe('createSecureHash', () => {
    it('should create consistent hash for same input', () => {
      const hash1 = createSecureHash(testData);
      const hash2 = createSecureHash(testData);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(128); // SHA-512 = 128 hex chars
    });

    it('should create different hashes for different inputs', () => {
      const hash1 = createSecureHash('data1');
      const hash2 = createSecureHash('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = createSecureHash('');
      
      expect(hash).toHaveLength(128);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });
});
