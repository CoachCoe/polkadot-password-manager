// Polkadot Password Manager
// Security configuration and constants

export interface SecurityConfig {
  // Encryption settings
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
    tagLength: number;
    saltLength: number;
    iterations: number;
  };
  
  // Password requirements
  password: {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    minEntropy: number;
  };
  
  // Session settings
  session: {
    maxAge: number;
    refreshThreshold: number;
    maxSessionsPerUser: number;
    cleanupInterval: number;
  };
  
  // Rate limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  
  // Input validation
  validation: {
    maxStringLength: number;
    maxCredentialSize: number;
    maxRequestSize: number;
    allowedFileTypes: string[];
  };
  
  // Security headers
  headers: {
    hsts: {
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    csp: {
      defaultSrc: string[];
      scriptSrc: string[];
      styleSrc: string[];
      imgSrc: string[];
      connectSrc: string[];
    };
  };
  
  // Audit logging
  audit: {
    enabled: boolean;
    logLevel: string;
    sensitiveFields: string[];
    maxLogSize: number;
  };
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32, // 256 bits
    ivLength: 16,  // 128 bits
    tagLength: 16, // 128 bits
    saltLength: 32, // 256 bits
    iterations: 100000 // PBKDF2 iterations
  },
  
  password: {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    minEntropy: 50
  },
  
  session: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    refreshThreshold: 15 * 60 * 1000, // 15 minutes
    maxSessionsPerUser: 5,
    cleanupInterval: 60 * 60 * 1000 // 1 hour
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  validation: {
    maxStringLength: 10000,
    maxCredentialSize: 1000000, // 1MB
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['application/json', 'text/plain']
  },
  
  headers: {
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    csp: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  },
  
  audit: {
    enabled: true,
    logLevel: 'info',
    sensitiveFields: ['password', 'token', 'secret', 'key', 'private'],
    maxLogSize: 1000000 // 1MB
  }
};

export const PRODUCTION_SECURITY_CONFIG: SecurityConfig = {
  ...DEFAULT_SECURITY_CONFIG,
  
  password: {
    ...DEFAULT_SECURITY_CONFIG.password,
    minLength: 16,
    minEntropy: 80
  },
  
  session: {
    ...DEFAULT_SECURITY_CONFIG.session,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    maxSessionsPerUser: 3
  },
  
  rateLimit: {
    ...DEFAULT_SECURITY_CONFIG.rateLimit,
    maxRequests: 50
  },
  
  headers: {
    ...DEFAULT_SECURITY_CONFIG.headers,
    csp: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  },
  
  audit: {
    ...DEFAULT_SECURITY_CONFIG.audit,
    logLevel: 'warn'
  }
};

export const DEVELOPMENT_SECURITY_CONFIG: SecurityConfig = {
  ...DEFAULT_SECURITY_CONFIG,
  
  password: {
    ...DEFAULT_SECURITY_CONFIG.password,
    minLength: 8,
    minEntropy: 30
  },
  
  session: {
    ...DEFAULT_SECURITY_CONFIG.session,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    maxSessionsPerUser: 10
  },
  
  rateLimit: {
    ...DEFAULT_SECURITY_CONFIG.rateLimit,
    maxRequests: 1000
  },
  
  audit: {
    ...DEFAULT_SECURITY_CONFIG.audit,
    logLevel: 'debug'
  }
};

/**
 * Get security configuration based on environment
 */
export function getSecurityConfig(): SecurityConfig {
  const env = process.env['NODE_ENV'] || 'development';
  
  switch (env) {
    case 'production':
      return PRODUCTION_SECURITY_CONFIG;
    case 'development':
      return DEVELOPMENT_SECURITY_CONFIG;
    default:
      return DEFAULT_SECURITY_CONFIG;
  }
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: SecurityConfig): boolean {
  // Validate encryption settings
  if (config.encryption.keyLength < 16) return false;
  if (config.encryption.iterations < 10000) return false;
  
  // Validate password settings
  if (config.password.minLength < 8) return false;
  if (config.password.minEntropy < 20) return false;
  
  // Validate session settings
  if (config.session.maxAge < 60000) return false; // At least 1 minute
  if (config.session.maxSessionsPerUser < 1) return false;
  
  // Validate rate limiting
  if (config.rateLimit.maxRequests < 1) return false;
  if (config.rateLimit.windowMs < 1000) return false;
  
  // Validate validation settings
  if (config.validation.maxStringLength < 100) return false;
  if (config.validation.maxCredentialSize < 1000) return false;
  
  return true;
}

/**
 * Security constants
 */
export const SECURITY_CONSTANTS = {
  // Token lengths
  SESSION_TOKEN_LENGTH: 64,
  REFRESH_TOKEN_LENGTH: 128,
  API_KEY_LENGTH: 32,
  
  // Timeouts
  REQUEST_TIMEOUT: 30000, // 30 seconds
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_REQUEST: 5,
  
  // Database limits
  MAX_QUERY_RESULTS: 1000,
  MAX_BATCH_SIZE: 100,
  
  // Memory limits
  MAX_MEMORY_USAGE: 512 * 1024 * 1024, // 512MB
  GC_THRESHOLD: 0.8, // 80% memory usage
  
  // Network limits
  MAX_CONNECTIONS: 100,
  MAX_CONCURRENT_REQUESTS: 50
} as const;

/**
 * Security event types for audit logging
 */
export enum SecurityEventType {
  AUTHENTICATION_SUCCESS = 'authentication_success',
  AUTHENTICATION_FAILURE = 'authentication_failure',
  AUTHORIZATION_SUCCESS = 'authorization_success',
  AUTHORIZATION_FAILURE = 'authorization_failure',
  SESSION_CREATED = 'session_created',
  SESSION_DESTROYED = 'session_destroyed',
  PASSWORD_CHANGED = 'password_changed',
  CREDENTIAL_CREATED = 'credential_created',
  CREDENTIAL_ACCESSED = 'credential_accessed',
  CREDENTIAL_MODIFIED = 'credential_modified',
  CREDENTIAL_DELETED = 'credential_deleted',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SECURITY_VIOLATION = 'security_violation',
  SYSTEM_ERROR = 'system_error'
}

/**
 * Security risk levels
 */
export enum SecurityRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
