// Polkadot Password Manager
// Security middleware for comprehensive protection

import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';
import { validateSessionToken, sanitizeHtml } from '../utils/validation.js';
import { createSecureHash } from '../utils/encryption.js';

const logger = createLogger('security-middleware');

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

/**
 * Apply security headers to all responses
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
}

/**
 * Rate limiting middleware
 */
export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  _skipSuccessfulRequests?: boolean;
}) {
  const { windowMs, maxRequests, keyGenerator } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }

    const current = rateLimitStore.get(key);
    
    if (!current) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (now > current.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      logger.warn('Rate limit exceeded', { 
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });
      
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      });
      return;
    }

    current.count++;
    next();
  };
}

/**
 * Input sanitization middleware
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  // Sanitize query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeHtml(value);
      }
    }
  }

  // Sanitize body parameters
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      obj[key] = sanitizeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitizeObject(value);
    }
  }
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = createSecureHash(`${req.ip}-${Date.now()}-${Math.random()}`);
  
  // Add request ID to headers
  res.setHeader('X-Request-ID', requestId);
  
  // Log request
  logger.info('Request started', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length')
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length')
    });

    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Authentication middleware
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.get('Authorization');
  
  if (!authHeader) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authorization header required'
    });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  const tokenValidation = validateSessionToken(token);
  
  if (!tokenValidation.isValid) {
    logger.warn('Invalid session token', { 
      ip: req.ip,
      token: token.substring(0, 8) + '...'
    });
    
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid session token'
    });
    return;
  }

  // Add sanitized token to request
  (req as any).user = { token: tokenValidation.sanitized! };
  next();
}

/**
 * CORS configuration
 */
export function corsConfig(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get('Origin');
  const allowedOrigins = process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}

/**
 * Error handling middleware
 */
export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const isDevelopment = process.env['NODE_ENV'] === 'development';
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? error.message : 'An unexpected error occurred',
    ...(isDevelopment && { stack: error.stack })
  });
}

/**
 * Request size limiter
 */
export function requestSizeLimit(maxSize: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      res.status(413).json({
        error: 'Payload Too Large',
        message: `Request size exceeds limit of ${maxSize} bytes`
      });
      return;
    }
    
    next();
  };
}

/**
 * IP whitelist middleware (for admin endpoints)
 */
export function ipWhitelist(allowedIPs: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!clientIP || !allowedIPs.includes(clientIP)) {
      logger.warn('IP not whitelisted', { ip: clientIP, path: req.path });
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
      return;
    }
    
    next();
  };
}

/**
 * Session validation middleware
 */
export function validateSession(req: Request, res: Response, next: NextFunction): void {
  const sessionId = (req as any).user?.token;
  
  if (!sessionId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid session required'
    });
    return;
  }
  
  // In a real implementation, you would validate the session against your database
  // For now, we'll just ensure the token format is valid
  const tokenValidation = validateSessionToken(sessionId);
  
  if (!tokenValidation.isValid) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid session'
    });
    return;
  }
  
  next();
}
