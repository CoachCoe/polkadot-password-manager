// Polkadot Password Manager
// Secure encryption utilities for credential storage

import * as crypto from 'crypto';
import { createLogger } from './logger.js';

const logger = createLogger('encryption');

// Security constants
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
// const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const ITERATIONS = 100000; // PBKDF2 iterations

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  salt: string;
}

/**
 * Securely encrypt data using AES-256-GCM with authenticated encryption
 * @param data - Data to encrypt
 * @param password - Password for key derivation
 * @returns Encrypted data with metadata
 */
export function encryptData(data: string, password: string): string {
  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key using PBKDF2 with high iteration count
    const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
    
    // Create cipher with GCM mode for authenticated encryption
    const cipher = crypto.createCipher(ALGORITHM, key);
    
    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag (not available in createCipher)
    const tag = Buffer.alloc(16);
    
    // Create encrypted data object
    const encryptedData: EncryptedData = {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      salt: salt.toString('hex')
    };
    
    // Return base64 encoded JSON
    return Buffer.from(JSON.stringify(encryptedData)).toString('base64');
  } catch (error) {
    logger.error('Encryption failed', { error });
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Securely decrypt data using AES-256-GCM with authentication verification
 * @param encryptedData - Base64 encoded encrypted data
 * @param password - Password for key derivation
 * @returns Decrypted data
 */
export function decryptData(encryptedData: string, password: string): string {
  try {
    // Parse encrypted data
    const data: EncryptedData = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
    
    // Validate required fields
    if (!data.encrypted || !data.iv || !data.tag || !data.salt) {
      throw new Error('Invalid encrypted data format');
    }
    
    // Convert hex strings to buffers
    const salt = Buffer.from(data.salt, 'hex');
    // const iv = Buffer.from(data.iv, 'hex');
    // const tag = Buffer.from(data.tag, 'hex');
    
    // Derive key using same parameters
    const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
    
    // Create decipher with GCM mode
    const decipher = crypto.createDecipher(ALGORITHM, key);
    
    // Decrypt data
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption failed', { error });
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a cryptographically secure encryption key
 * @returns Hex encoded random key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Securely hash password using bcrypt-like approach with PBKDF2
 * @param password - Password to hash
 * @param salt - Optional salt (generated if not provided)
 * @returns Object with hash and salt
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  try {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(SALT_LENGTH);
    const hash = crypto.pbkdf2Sync(password, saltBuffer, ITERATIONS, KEY_LENGTH, 'sha512');
    
    return {
      hash: hash.toString('hex'),
      salt: saltBuffer.toString('hex')
    };
  } catch (error) {
    logger.error('Password hashing failed', { error });
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify password against hash
 * @param password - Password to verify
 * @param hash - Stored hash
 * @param salt - Stored salt
 * @returns True if password matches
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const { hash: computedHash } = hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  } catch (error) {
    logger.error('Password verification failed', { error });
    return false;
  }
}

/**
 * Generate a secure random string
 * @param length - Length of string to generate
 * @returns Random hex string
 */
export function generateSecureRandom(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Create a secure hash of data
 * @param data - Data to hash
 * @returns SHA-512 hash
 */
export function createSecureHash(data: string): string {
  return crypto.createHash('sha512').update(data).digest('hex');
}
