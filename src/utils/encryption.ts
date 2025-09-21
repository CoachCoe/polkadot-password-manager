// Polkadot Password Manager
// Encryption utilities for secure credential storage

import * as crypto from 'crypto';

export function encryptData(data: string, key: string): string {
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16);
  const keyBuffer = crypto.createHash('sha256').update(key).digest();
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptData(encryptedData: string, key: string): string {
  const algorithm = 'aes-256-cbc';
  const parts = encryptedData.split(':');
  
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0]!, 'hex');
  const encrypted = parts[1]!;
  const keyBuffer = crypto.createHash('sha256').update(key).digest();
  
  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}
