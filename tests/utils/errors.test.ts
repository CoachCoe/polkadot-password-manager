import {
  createAuthError,
  handleError,
  logError,
  sanitizeErrorForClient,
  getHttpStatusForError,
  createErrorFromStatus,
  validateErrorContext,
  createErrorMetrics,
  ErrorCode,
  ErrorSeverity
} from '../../src/utils/errors';

describe('Error Handling Utilities', () => {
  describe('createAuthError', () => {
    it('should create error with all properties', () => {
      const error = createAuthError(
        ErrorCode.VALIDATION_ERROR,
        'Test error message',
        { field: 'test' },
        ErrorSeverity.HIGH
      );

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.message).toBe('Test error message');
      expect(error.context).toEqual({ field: 'test' });
      expect(error.timestamp).toBeDefined();
      expect(error.name).toBe('AuthError');
    });

    it('should use default severity when not provided', () => {
      const error = createAuthError(ErrorCode.VALIDATION_ERROR, 'Test message');

      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should handle missing context', () => {
      const error = createAuthError(ErrorCode.VALIDATION_ERROR, 'Test message');

      expect(error.context).toEqual({});
    });
  });

  describe('handleError', () => {
    it('should handle error without throwing', () => {
      const error = createAuthError(ErrorCode.VALIDATION_ERROR, 'Test error');
      
      expect(() => {
        handleError(error, { additional: 'context' });
      }).not.toThrow();
    });

    it('should handle regular Error objects without throwing', () => {
      const error = new Error('Regular error');
      
      expect(() => {
        handleError(error);
      }).not.toThrow();
    });
  });

  describe('logError', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log error with structured data', () => {
      const error = createAuthError(ErrorCode.VALIDATION_ERROR, 'Test error');
      logError(error, { test: 'context' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error logged'),
        expect.objectContaining({
          message: 'Test error',
          code: ErrorCode.VALIDATION_ERROR,
          severity: ErrorSeverity.MEDIUM
        })
      );
    });
  });

  describe('sanitizeErrorForClient', () => {
    it('should sanitize error for client in development', () => {
      process.env.NODE_ENV = 'development';
      
      const error = createAuthError(ErrorCode.VALIDATION_ERROR, 'Test error');
      const response = sanitizeErrorForClient(error, 'req-123');

      expect(response.error).toBe(ErrorCode.VALIDATION_ERROR);
      expect(response.message).toBe('Test error');
      expect(response.requestId).toBe('req-123');
      expect(response.details).toBeDefined();
    });

    it('should sanitize error for client in production', () => {
      process.env.NODE_ENV = 'production';
      
      const error = createAuthError(ErrorCode.VALIDATION_ERROR, 'Test error');
      const response = sanitizeErrorForClient(error);

      expect(response.error).toBe(ErrorCode.VALIDATION_ERROR);
      expect(response.message).toBe('Test error'); // Low severity errors are exposed in production
      expect(response.details).toEqual({});
    });

    it('should expose details for low severity errors in production', () => {
      process.env.NODE_ENV = 'production';
      
      const error = createAuthError(ErrorCode.VALIDATION_ERROR, 'Test error', undefined, ErrorSeverity.LOW);
      const response = sanitizeErrorForClient(error);

      expect(response.message).toBe('Test error');
    });
  });

  describe('getHttpStatusForError', () => {
    it('should return correct status for authentication errors', () => {
      const error = createAuthError(ErrorCode.AUTHENTICATION_FAILED, 'Auth failed');
      const status = getHttpStatusForError(error);

      expect(status).toBe(401);
    });

    it('should return correct status for validation errors', () => {
      const error = createAuthError(ErrorCode.VALIDATION_ERROR, 'Validation failed');
      const status = getHttpStatusForError(error);

      expect(status).toBe(400);
    });

    it('should return correct status for forbidden errors', () => {
      const error = createAuthError(ErrorCode.FORBIDDEN, 'Access denied');
      const status = getHttpStatusForError(error);

      expect(status).toBe(403);
    });

    it('should return correct status for not found errors', () => {
      const error = createAuthError(ErrorCode.CREDENTIAL_NOT_FOUND, 'Not found');
      const status = getHttpStatusForError(error);

      expect(status).toBe(404);
    });

    it('should return correct status for rate limit errors', () => {
      const error = createAuthError(ErrorCode.RATE_LIMIT_EXCEEDED, 'Too many requests');
      const status = getHttpStatusForError(error);

      expect(status).toBe(429);
    });

    it('should return 500 for internal errors', () => {
      const error = createAuthError(ErrorCode.INTERNAL_ERROR, 'Internal error');
      const status = getHttpStatusForError(error);

      expect(status).toBe(500);
    });
  });

  describe('createErrorFromStatus', () => {
    it('should create error from HTTP status', () => {
      const error = createErrorFromStatus(400, 'Bad request');

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Bad request');
      expect(error.context).toEqual({ statusCode: 400 });
    });

    it('should use default message when not provided', () => {
      const error = createErrorFromStatus(500);

      expect(error.message).toBe('HTTP 500 error');
    });
  });

  describe('validateErrorContext', () => {
    it('should validate safe context', () => {
      const context = { field: 'value', count: 123 };
      const isValid = validateErrorContext(context);

      expect(isValid).toBe(true);
    });

    it('should reject context with sensitive data', () => {
      const context = { password: 'secret', field: 'value' };
      const isValid = validateErrorContext(context);

      expect(isValid).toBe(false);
    });

    it('should reject non-object context', () => {
      const isValid = validateErrorContext('not an object');

      expect(isValid).toBe(false);
    });
  });

  describe('createErrorMetrics', () => {
    it('should create metrics for error', () => {
      const error = createAuthError(ErrorCode.VALIDATION_ERROR, 'Test error');
      const metrics = createErrorMetrics(error);

      expect(metrics.errorCode).toBe(ErrorCode.VALIDATION_ERROR);
      expect(metrics.severity).toBe(ErrorSeverity.MEDIUM);
      expect(metrics.timestamp).toBeDefined();
      expect(metrics.hasContext).toBe(true);
      expect(metrics.contextValid).toBe(true);
    });

    it('should handle error without context', () => {
      const error = new Error('Regular error');
      const metrics = createErrorMetrics(error);

      expect(metrics.errorCode).toBe('UNKNOWN');
      expect(metrics.hasContext).toBe(false);
    });
  });
});
