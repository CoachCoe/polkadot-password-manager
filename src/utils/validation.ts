// Polkadot Password Manager
// Validation utilities for credential data

export function validateCredentialData(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Basic validation - can be extended
  return true;
}

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < 8) {
    feedback.push('Password should be at least 8 characters long');
  } else {
    score += 1;
  }

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

  return {
    isValid: score >= 3,
    score,
    feedback
  };
}
