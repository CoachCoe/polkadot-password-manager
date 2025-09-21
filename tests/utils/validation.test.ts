import {
  validateString,
  validatePolkadotAddress,
  validateEmail,
  validateUrl,
  validateCredentialData,
  validatePasswordStrength,
  validateSessionToken,
  sanitizeHtml,
  validateJson
} from '../../src/utils/validation';

describe('Validation Utilities', () => {
  describe('validateString', () => {
    it('should validate basic string input', () => {
      const result = validateString('test');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test');
    });

    it('should handle required validation', () => {
      const result = validateString('', { required: true });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should handle length constraints', () => {
      const result = validateString('a', { minLength: 3, maxLength: 5 });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    it('should handle pattern validation', () => {
      const result = validateString('test123', { pattern: /^[a-z]+$/ });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('does not match required pattern');
    });

    it('should trim input by default', () => {
      const result = validateString('  test  ');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test');
    });

    it('should handle null and undefined', () => {
      const result1 = validateString(null, { required: false });
      const result2 = validateString(undefined, { required: false });
      
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });
  });

  describe('validatePolkadotAddress', () => {
    it('should validate correct Polkadot address', () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const result = validatePolkadotAddress(address);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(address);
    });

    it('should reject invalid address format', () => {
      const result = validatePolkadotAddress('invalid-address');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid Polkadot address format');
    });

    it('should reject address with wrong length', () => {
      const result = validatePolkadotAddress('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY123');
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const result = validateEmail('test@example.com');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test@example.com');
    });

    it('should reject invalid email format', () => {
      const result = validateEmail('invalid-email');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    it('should handle complex email addresses', () => {
      const result = validateEmail('user.name+tag@example.co.uk');
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URL', () => {
      const result = validateUrl('https://example.com');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('https://example.com');
    });

    it('should reject invalid URL format', () => {
      const result = validateUrl('not-a-url');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid URL format');
    });

    it('should allow HTTP in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const result = validateUrl('http://example.com');
      
      expect(result.isValid).toBe(true);
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('validateCredentialData', () => {
    it('should validate correct credential data', () => {
      const data = {
        name: 'Test Credential',
        username: 'testuser',
        password: 'testpass123'
      };
      
      const result = validateCredentialData(data);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBeDefined();
    });

    it('should reject missing required fields', () => {
      const data = {
        name: 'Test Credential'
        // missing username and password
      };
      
      const result = validateCredentialData(data);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing required field');
    });

    it('should reject non-object input', () => {
      const result = validateCredentialData('not-an-object');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be an object');
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = validatePasswordStrength('StrongPass123!');
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(4);
      expect(result.entropy).toBeGreaterThan(50);
    });

    it('should reject weak password', () => {
      const result = validatePasswordStrength('weak');
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(4);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should provide feedback for password improvements', () => {
      const result = validatePasswordStrength('password');
      
      expect(result.feedback).toContain('Password should be at least 12 characters long');
      expect(result.feedback).toContain('Password should contain at least one uppercase letter');
    });

    it('should detect common patterns', () => {
      const result = validatePasswordStrength('abc123abc123');
      
      expect(result.feedback).toContain('Password should not contain common sequences');
    });
  });

  describe('validateSessionToken', () => {
    it('should validate correct session token', () => {
      const token = 'a'.repeat(32);
      const result = validateSessionToken(token);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(token);
    });

    it('should reject token that is too short', () => {
      const result = validateSessionToken('short');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid session token format');
    });

    it('should reject token with invalid characters', () => {
      const result = validateSessionToken('a'.repeat(32) + '!');
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('should sanitize HTML special characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeHtml(input);
      
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should handle quotes and slashes', () => {
      const input = 'test"value\'with/slash';
      const result = sanitizeHtml(input);
      
      expect(result).toContain('&quot;');
      expect(result).toContain('&#x27;');
      expect(result).toContain('&#x2F;');
    });
  });

  describe('validateJson', () => {
    it('should validate correct JSON', () => {
      const json = '{"key": "value"}';
      const result = validateJson(json);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('{"key":"value"}'); // JSON.stringify normalizes spacing
    });

    it('should reject invalid JSON', () => {
      const result = validateJson('invalid json');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid JSON format');
    });
  });
});
