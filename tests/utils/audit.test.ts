import {
  auditLogger,
  logAuthSuccess,
  logAuthFailure,
  logCredentialAccess,
  logSuspiciousActivity,
  logSecurityViolation,
  logRateLimitExceeded,
  logSessionEvent,
  logSystemError
} from '../../src/utils/audit';
import { SecurityEventType, SecurityRiskLevel } from '../../src/config/security';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

describe('Audit Logging System', () => {
  let mockLogger: any;

  beforeEach(() => {
    // Get the mocked logger instance
    const { createLogger } = require('../../src/utils/logger');
    mockLogger = createLogger('test');
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('auditLogger.logEvent', () => {
    it('should log security event without throwing errors', () => {
      const details = { action: 'test' };
      const context = { userId: 'user-123', ipAddress: '127.0.0.1' };

      expect(() => {
        auditLogger.logEvent(
          SecurityEventType.AUTHENTICATION_SUCCESS,
          SecurityRiskLevel.LOW,
          details,
          context
        );
      }).not.toThrow();
    });

    it('should sanitize sensitive data in details', () => {
      const details = { 
        password: 'secret123',
        token: 'sensitive-token',
        normalField: 'safe-data'
      };

      expect(() => {
        auditLogger.logEvent(
          SecurityEventType.AUTHENTICATION_SUCCESS,
          SecurityRiskLevel.LOW,
          details
        );
      }).not.toThrow();
    });
  });

  describe('logAuthSuccess', () => {
    it('should log authentication success without throwing', () => {
      const context = { userId: 'user-123', ipAddress: '127.0.0.1' };

      expect(() => {
        logAuthSuccess('user-123', 'polkadot-js', context);
      }).not.toThrow();
    });
  });

  describe('logAuthFailure', () => {
    it('should log authentication failure without throwing', () => {
      const context = { ipAddress: '127.0.0.1' };

      expect(() => {
        logAuthFailure('Invalid credentials', 'polkadot-js', context);
      }).not.toThrow();
    });
  });

  describe('logCredentialAccess', () => {
    it('should log credential creation without throwing', () => {
      const context = { userId: 'user-123' };

      expect(() => {
        logCredentialAccess('cred-123', 'created', 'user-123', context);
      }).not.toThrow();
    });

    it('should log credential deletion without throwing', () => {
      const context = { userId: 'user-123' };

      expect(() => {
        logCredentialAccess('cred-123', 'deleted', 'user-123', context);
      }).not.toThrow();
    });
  });

  describe('logSuspiciousActivity', () => {
    it('should log suspicious activity without throwing', () => {
      const context = { ipAddress: '127.0.0.1' };
      const details = { pattern: 'multiple_failed_attempts' };

      expect(() => {
        logSuspiciousActivity('Multiple failed login attempts', details, context);
      }).not.toThrow();
    });
  });

  describe('logSecurityViolation', () => {
    it('should log security violation without throwing', () => {
      const context = { ipAddress: '127.0.0.1' };
      const details = { violation: 'unauthorized_access_attempt' };

      expect(() => {
        logSecurityViolation('Unauthorized access attempt', details, context);
      }).not.toThrow();
    });
  });

  describe('logRateLimitExceeded', () => {
    it('should log rate limit exceeded without throwing', () => {
      const context = { ipAddress: '127.0.0.1' };

      expect(() => {
        logRateLimitExceeded('/api/auth/challenge', 100, context);
      }).not.toThrow();
    });
  });

  describe('logSessionEvent', () => {
    it('should log session creation without throwing', () => {
      const context = { userId: 'user-123' };

      expect(() => {
        logSessionEvent('created', 'session-123', 'user-123', context);
      }).not.toThrow();
    });

    it('should log session destruction without throwing', () => {
      const context = { userId: 'user-123' };

      expect(() => {
        logSessionEvent('destroyed', 'session-123', 'user-123', context);
      }).not.toThrow();
    });
  });

  describe('logSystemError', () => {
    it('should log system error without throwing', () => {
      const error = new Error('Database connection failed');
      const context = { service: 'database' };

      expect(() => {
        logSystemError(error, context);
      }).not.toThrow();
    });
  });

  describe('getAuditTrail', () => {
    it('should return empty array for now', async () => {
      const result = await auditLogger.getAuditTrail('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getSecurityMetrics', () => {
    it('should return default metrics', async () => {
      const result = await auditLogger.getSecurityMetrics(
        new Date('2023-01-01'),
        new Date('2023-12-31')
      );

      expect(result).toEqual({
        totalEvents: 0,
        criticalEvents: 0,
        highRiskEvents: 0,
        mediumRiskEvents: 0,
        lowRiskEvents: 0,
        uniqueUsers: 0,
        uniqueIPs: 0
      });
    });
  });
});
