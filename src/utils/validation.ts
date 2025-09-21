// Polkadot Password Manager
// Comprehensive validation utilities for security and data integrity

// import { createLogger } from './logger.js';

// const logger = createLogger('validation');

// Security constants
const MAX_STRING_LENGTH = 10000;
const MAX_CREDENTIAL_SIZE = 1000000; // 1MB
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number;
  feedback: string[];
  entropy: number;
}

/**
 * Validate and sanitize string input
 */
export function validateString(
  input: any,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowEmpty?: boolean;
    trim?: boolean;
  } = {}
): ValidationResult {
  const {
    required = false,
    minLength = 0,
    maxLength = MAX_STRING_LENGTH,
    pattern,
    allowEmpty = false,
    trim = true
  } = options;

  // Check if input exists
  if (input === null || input === undefined) {
    if (required) {
      return { isValid: false, error: 'Input is required' };
    }
    return { isValid: true, sanitized: '' };
  }

  // Convert to string
  let str = String(input);
  
  // Trim if requested
  if (trim) {
    str = str.trim();
  }

  // Check if empty
  if (!allowEmpty && str.length === 0) {
    if (required) {
      return { isValid: false, error: 'Input cannot be empty' };
    }
    return { isValid: true, sanitized: '' };
  }

  // Check length constraints
  if (str.length < minLength) {
    return { isValid: false, error: `Input must be at least ${minLength} characters long` };
  }

  if (str.length > maxLength) {
    return { isValid: false, error: `Input must be no more than ${maxLength} characters long` };
  }

  // Check pattern if provided
  if (pattern && !pattern.test(str)) {
    return { isValid: false, error: 'Input does not match required pattern' };
  }

  return { isValid: true, sanitized: str };
}

/**
 * Validate Polkadot address format
 */
export function validatePolkadotAddress(address: string): ValidationResult {
  const addressValidation = validateString(address, {
    required: true,
    minLength: 47,
    maxLength: 48,
    pattern: /^[1-9A-HJ-NP-Za-km-z]{47,48}$/
  });

  if (!addressValidation.isValid) {
    return { isValid: false, error: 'Invalid Polkadot address format' };
  }

  return addressValidation;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  const emailValidation = validateString(email, {
    required: true,
    maxLength: 254,
    pattern: emailPattern
  });

  if (!emailValidation.isValid) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return emailValidation;
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTPS in production
    if (process.env['NODE_ENV'] === 'production' && urlObj.protocol !== 'https:') {
      return { isValid: false, error: 'Only HTTPS URLs are allowed in production' };
    }

    return { isValid: true, sanitized: url };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate credential data structure and content
 */
export function validateCredentialData(data: any): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Credential data must be an object' };
  }

  // Check for required fields
  const requiredFields = ['name', 'username', 'password'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      return { isValid: false, error: `Missing required field: ${field}` };
    }
  }

  // Validate individual fields
  const nameValidation = validateString(data.name, { required: true, maxLength: 255 });
  if (!nameValidation.isValid) {
    return { isValid: false, error: `Invalid name: ${nameValidation.error}` };
  }

  const usernameValidation = validateString(data.username, { required: true, maxLength: 255 });
  if (!usernameValidation.isValid) {
    return { isValid: false, error: `Invalid username: ${usernameValidation.error}` };
  }

  const passwordValidation = validateString(data.password, { required: true, maxLength: 1000 });
  if (!passwordValidation.isValid) {
    return { isValid: false, error: `Invalid password: ${passwordValidation.error}` };
  }

  // Check data size
  const dataSize = JSON.stringify(data).length;
  if (dataSize > MAX_CREDENTIAL_SIZE) {
    return { isValid: false, error: 'Credential data too large' };
  }

  // Sanitize the data
  const sanitized = {
    name: nameValidation.sanitized!,
    username: usernameValidation.sanitized!,
    password: passwordValidation.sanitized!,
    ...(data.url && { url: data.url }),
    ...(data.notes && { notes: data.notes })
  };

  return { isValid: true, sanitized: JSON.stringify(sanitized) };
}

/**
 * Comprehensive password strength validation
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  // Length checks
  if (password.length < MIN_PASSWORD_LENGTH) {
    feedback.push(`Password should be at least ${MIN_PASSWORD_LENGTH} characters long`);
  } else if (password.length >= 16) {
    score += 2;
  } else {
    score += 1;
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    feedback.push(`Password should be no more than ${MAX_PASSWORD_LENGTH} characters long`);
  }

  // Character variety checks
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password should contain at least one uppercase letter');
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('Password should contain at least one lowercase letter');
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    feedback.push('Password should contain at least one number');
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push('Password should contain at least one special character');
  } else {
    score += 1;
  }

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Password should not contain repeated characters');
    score -= 1;
  }

  if (/123|abc|qwe|asd|zxc/i.test(password)) {
    feedback.push('Password should not contain common sequences');
    score -= 1;
  }

  // Calculate entropy
  const entropy = calculateEntropy(password);

  // Additional entropy-based feedback
  if (entropy < 50) {
    feedback.push('Password has low entropy - consider using a longer, more random password');
  } else if (entropy >= 80) {
    score += 1;
  }

  return {
    isValid: score >= 4 && password.length >= MIN_PASSWORD_LENGTH,
    score: Math.max(0, Math.min(10, score)),
    feedback,
    entropy
  };
}

/**
 * Calculate password entropy
 */
function calculateEntropy(password: string): number {
  let charset = 0;
  
  if (/[a-z]/.test(password)) charset += 26;
  if (/[A-Z]/.test(password)) charset += 26;
  if (/\d/.test(password)) charset += 10;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) charset += 32;
  
  return Math.log2(Math.pow(charset, password.length));
}

/**
 * Validate session token format
 */
export function validateSessionToken(token: string): ValidationResult {
  const tokenValidation = validateString(token, {
    required: true,
    minLength: 32,
    maxLength: 256,
    pattern: /^[a-zA-Z0-9\-_]+$/
  });

  if (!tokenValidation.isValid) {
    return { isValid: false, error: 'Invalid session token format' };
  }

  return tokenValidation;
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate JSON data
 */
export function validateJson(input: string): ValidationResult {
  try {
    const parsed = JSON.parse(input);
    return { isValid: true, sanitized: JSON.stringify(parsed) };
  } catch (error) {
    return { isValid: false, error: 'Invalid JSON format' };
  }
}
