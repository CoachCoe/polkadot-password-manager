import { Request, Response, NextFunction } from 'express';
import {
  securityHeaders,
  rateLimit,
  sanitizeInput,
  requestLogger,
  requireAuth,
  corsConfig,
  errorHandler,
  requestSizeLimit,
  ipWhitelist,
  validateSession,
  rateLimitStore
} from '../../src/middleware/security';

// Mock Express request and response
const createMockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'GET',
  path: '/test',
  ip: '127.0.0.1',
  get: jest.fn(),
  query: {},
  body: {},
  ...overrides
});

const createMockRes = (): Partial<Response> => {
  const res: Partial<Response> = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    get: jest.fn()
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('Security Middleware', () => {
  describe('securityHeaders', () => {
    it('should set security headers', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      securityHeaders(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('rateLimit', () => {
    beforeEach(() => {
      // Clear the rate limit store before each test
      rateLimitStore.clear();
    });

    it('should allow requests within limit', () => {
      const rateLimiter = rateLimit({
        windowMs: 1000,
        maxRequests: 5,
        keyGenerator: (req) => req.ip || 'unknown'
      });

      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      rateLimiter(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding limit', () => {
      const rateLimiter = rateLimit({
        windowMs: 1000,
        maxRequests: 1,
        keyGenerator: (req) => req.ip || 'unknown'
      });

      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      // First request should pass
      rateLimiter(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Reset the mock for the second request
      next.mockClear();

      // Second request should be blocked
      const next2 = createMockNext();
      const res2 = createMockRes();
      rateLimiter(req as Request, res2 as Response, next2);

      expect(next2).not.toHaveBeenCalled();
      expect(res2.status).toHaveBeenCalledWith(429);
      expect(res2.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too Many Requests'
        })
      );
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize query parameters', () => {
      const req = createMockReq({
        query: { search: '<script>alert("xss")</script>' }
      });
      const res = createMockRes();
      const next = createMockNext();

      sanitizeInput(req as Request, res as Response, next);

      expect(req.query?.search).toContain('&lt;script&gt;');
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize body parameters', () => {
      const req = createMockReq({
        body: { content: '<img src="x" onerror="alert(1)">' }
      });
      const res = createMockRes();
      const next = createMockNext();

      sanitizeInput(req as Request, res as Response, next);

      expect(req.body?.content).toContain('&lt;img');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requestLogger', () => {
    it('should log request and response', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      requestLogger(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('should reject request without authorization header', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      requireAuth(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authorization header required'
      });
    });

    it('should reject request with invalid token', () => {
      const req = createMockReq();
      req.get = jest.fn().mockReturnValue('Bearer invalid-token');
      const res = createMockRes();
      const next = createMockNext();

      requireAuth(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid session token'
      });
    });

    it('should accept request with valid token', () => {
      const req = createMockReq();
      req.get = jest.fn().mockReturnValue('Bearer valid-session-token-32-characters-long');
      const res = createMockRes();
      const next = createMockNext();

      requireAuth(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect((req as any).user).toBeDefined();
    });
  });

  describe('corsConfig', () => {
    it('should handle preflight OPTIONS request', () => {
      const req = createMockReq({ method: 'OPTIONS' });
      const res = createMockRes();
      const next = createMockNext();

      corsConfig(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.end).toHaveBeenCalled();
    });

    it('should set CORS headers for allowed origin', () => {
      const req = createMockReq({
        get: jest.fn().mockReturnValue('http://localhost:3000')
      });
      const res = createMockRes();
      const next = createMockNext();

      corsConfig(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('errorHandler', () => {
    it('should handle error in development', () => {
      process.env.NODE_ENV = 'development';
      
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('Test error');

      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          message: 'Test error'
        })
      );
    });

    it('should handle error in production', () => {
      process.env.NODE_ENV = 'production';
      
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();
      const error = new Error('Test error');

      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        })
      );
    });
  });

  describe('requestSizeLimit', () => {
    it('should allow requests within size limit', () => {
      const limiter = requestSizeLimit(1000);
      const req = createMockReq({
        get: jest.fn().mockReturnValue('500')
      });
      const res = createMockRes();
      const next = createMockNext();

      limiter(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject requests exceeding size limit', () => {
      const limiter = requestSizeLimit(1000);
      const req = createMockReq({
        get: jest.fn().mockReturnValue('2000')
      });
      const res = createMockRes();
      const next = createMockNext();

      limiter(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Payload Too Large'
        })
      );
    });
  });

  describe('ipWhitelist', () => {
    it('should allow whitelisted IPs', () => {
      const whitelist = ipWhitelist(['127.0.0.1', '192.168.1.1']);
      const req = createMockReq({ ip: '127.0.0.1' });
      const res = createMockRes();
      const next = createMockNext();

      whitelist(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject non-whitelisted IPs', () => {
      const whitelist = ipWhitelist(['127.0.0.1']);
      const req = createMockReq({ ip: '192.168.1.100' });
      const res = createMockRes();
      const next = createMockNext();

      whitelist(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Access denied'
      });
    });
  });

  describe('validateSession', () => {
    it('should reject request without session', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      validateSession(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Valid session required'
      });
    });

    it('should accept request with valid session', () => {
      const req = createMockReq();
      (req as any).user = { token: 'valid-session-token-32-characters-long' };
      const res = createMockRes();
      const next = createMockNext();

      validateSession(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
