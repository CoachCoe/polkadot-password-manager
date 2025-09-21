// Polkadot Password Manager
// Comprehensive error handling system

import { createLogger } from './logger.js';

const logger = createLogger('error-handler');

export enum ErrorCode {
  // Authentication errors
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Business logic errors
  CREDENTIAL_NOT_FOUND = 'CREDENTIAL_NOT_FOUND',
  CREDENTIAL_ALREADY_EXISTS = 'CREDENTIAL_ALREADY_EXISTS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // SSO errors
  SSO_ERROR = 'SSO_ERROR',
  SSO_SERVER_UNAVAILABLE = 'SSO_SERVER_UNAVAILABLE',
  SSO_CHALLENGE_FAILED = 'SSO_CHALLENGE_FAILED',
  
  // Wallet errors
  WALLET_ERROR = 'WALLET_ERROR',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INVALID_ADDRESS = 'INVALID_ADDRESS'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AuthError extends Error {
  code: ErrorCode;
  severity: ErrorSeverity;
  context?: Record<string, any>;
  timestamp: number;
  requestId?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code: string;
  timestamp: number;
  requestId?: string | undefined;
  details?: Record<string, any>;
}

/**
 * Create a standardized authentication error
 */
export function createAuthError(
  code: ErrorCode,
  message: string,
  context?: Record<string, any>,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): AuthError {
  const error = new Error(message) as AuthError;
  error.code = code;
  error.severity = severity;
  error.context = context || {};
  error.timestamp = Date.now();
  error.name = 'AuthError';
  
  return error;
}

/**
 * Handle and log errors with appropriate severity
 */
export function handleError(error: Error, context?: Record<string, any>): void {
  const authError = error as AuthError;
  const logContext = {
    ...context,
    error: error.message,
    code: authError.code || 'UNKNOWN',
    severity: authError.severity || ErrorSeverity.MEDIUM,
    stack: error.stack
  };

  switch (authError.severity || ErrorSeverity.MEDIUM) {
    case ErrorSeverity.CRITICAL:
      logger.error('Critical error occurred', logContext);
      break;
    case ErrorSeverity.HIGH:
      logger.error('High severity error occurred', logContext);
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn('Medium severity error occurred', logContext);
      break;
    case ErrorSeverity.LOW:
      logger.info('Low severity error occurred', logContext);
      break;
    default:
      logger.error('Unknown error occurred', logContext);
  }
}

/**
 * Log error with structured logging
 */
export function logError(error: Error, context?: Record<string, any>): void {
  const authError = error as AuthError;
  
  logger.error('Error logged', {
    message: error.message,
    code: authError.code || 'UNKNOWN',
    severity: authError.severity || ErrorSeverity.MEDIUM,
    context: authError.context || context,
    stack: error.stack,
    timestamp: authError.timestamp || Date.now()
  });
}

/**
 * Convert error to client-safe response
 */
export function sanitizeErrorForClient(error: Error, requestId?: string): ErrorResponse {
  const authError = error as AuthError;
  const isDevelopment = process.env['NODE_ENV'] === 'development';
  
  // Determine if we should expose error details
  const shouldExposeDetails = isDevelopment || 
    (authError.severity === ErrorSeverity.LOW || authError.severity === ErrorSeverity.MEDIUM);
  
  return {
    error: authError.code || 'INTERNAL_ERROR',
    message: shouldExposeDetails ? error.message : 'An error occurred',
    code: authError.code || 'INTERNAL_ERROR',
    timestamp: authError.timestamp || Date.now(),
    requestId,
    ...(shouldExposeDetails && authError.context && { details: authError.context })
  };
}

/**
 * Get HTTP status code for error
 */
export function getHttpStatusForError(error: Error): number {
  const authError = error as AuthError;
  
  switch (authError.code) {
    case ErrorCode.AUTHENTICATION_FAILED:
    case ErrorCode.INVALID_CREDENTIALS:
    case ErrorCode.INVALID_TOKEN:
      return 401;
    
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.FORBIDDEN:
    case ErrorCode.INSUFFICIENT_PERMISSIONS:
      return 403;
    
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.INVALID_INPUT:
    case ErrorCode.MISSING_REQUIRED_FIELD:
    case ErrorCode.INVALID_FORMAT:
      return 400;
    
    case ErrorCode.CREDENTIAL_NOT_FOUND:
      return 404;
    
    case ErrorCode.CREDENTIAL_ALREADY_EXISTS:
      return 409;
    
    case ErrorCode.OPERATION_NOT_ALLOWED:
      return 405;
    
    case ErrorCode.RATE_LIMIT_EXCEEDED:
      return 429;
    
    case ErrorCode.SSO_SERVER_UNAVAILABLE:
    case ErrorCode.NETWORK_ERROR:
      return 503;
    
    case ErrorCode.INTERNAL_ERROR:
    case ErrorCode.DATABASE_ERROR:
    case ErrorCode.ENCRYPTION_ERROR:
    default:
      return 500;
  }
}

/**
 * Wrap async functions with error handling
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error as Error, { function: fn.name });
      throw error;
    }
  };
}

/**
 * Create error from HTTP status
 */
export function createErrorFromStatus(status: number, message?: string): AuthError {
  let code: ErrorCode;
  let severity: ErrorSeverity;
  
  switch (status) {
    case 400:
      code = ErrorCode.VALIDATION_ERROR;
      severity = ErrorSeverity.MEDIUM;
      break;
    case 401:
      code = ErrorCode.AUTHENTICATION_FAILED;
      severity = ErrorSeverity.HIGH;
      break;
    case 403:
      code = ErrorCode.FORBIDDEN;
      severity = ErrorSeverity.HIGH;
      break;
    case 404:
      code = ErrorCode.CREDENTIAL_NOT_FOUND;
      severity = ErrorSeverity.MEDIUM;
      break;
    case 429:
      code = ErrorCode.RATE_LIMIT_EXCEEDED;
      severity = ErrorSeverity.MEDIUM;
      break;
    case 500:
      code = ErrorCode.INTERNAL_ERROR;
      severity = ErrorSeverity.CRITICAL;
      break;
    case 503:
      code = ErrorCode.SSO_SERVER_UNAVAILABLE;
      severity = ErrorSeverity.HIGH;
      break;
    default:
      code = ErrorCode.INTERNAL_ERROR;
      severity = ErrorSeverity.MEDIUM;
  }
  
  return createAuthError(
    code,
    message || `HTTP ${status} error`,
    { statusCode: status },
    severity
  );
}

/**
 * Validate error context
 */
export function validateErrorContext(context: any): boolean {
  if (!context || typeof context !== 'object') {
    return false;
  }
  
  // Check for sensitive data that shouldn't be logged
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'private'];
  const contextStr = JSON.stringify(context).toLowerCase();
  
  return !sensitiveKeys.some(key => contextStr.includes(key));
}

/**
 * Create error metrics for monitoring
 */
export function createErrorMetrics(error: Error): Record<string, any> {
  const authError = error as AuthError;
  
  return {
    errorCode: authError.code || 'UNKNOWN',
    severity: authError.severity || ErrorSeverity.MEDIUM,
    timestamp: authError.timestamp || Date.now(),
    hasContext: !!authError.context,
    contextValid: authError.context ? validateErrorContext(authError.context) : true
  };
}
