import bcrypt from 'bcrypt';

/**
 * Configuration for password hashing
 */
const SALT_ROUNDS = 12; // Higher number = more secure but slower

/**
 * Hash a plain text password using bcrypt
 * @param password - The plain text password to hash
 * @returns Promise<string> - The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.trim().length === 0) {
    throw new Error('Password cannot be empty');
  }

  if (password.length < 5) {
    throw new Error('Password must be at least 5 characters long');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    throw new Error(
      `Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Verify a plain text password against a hashed password
 * @param password - The plain text password to verify
 * @param hashedPassword - The hashed password to compare against
 * @returns Promise<boolean> - True if password matches, false otherwise
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  if (!password || !hashedPassword) {
    return false;
  }

  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    // Log error but don't throw to prevent information leakage
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Check if a password hash needs to be rehashed (e.g., if salt rounds have increased)
 * @param hashedPassword - The existing hashed password
 * @returns boolean - True if the password should be rehashed
 */
export function needsRehash(hashedPassword: string): boolean {
  try {
    const rounds = bcrypt.getRounds(hashedPassword);
    return rounds < SALT_ROUNDS;
  } catch (error) {
    // If we can't determine rounds, assume it needs rehashing
    return true;
  }
}

/**
 * Generate a secure random password
 * @param length - Length of the password (default: 16)
 * @returns string - A randomly generated password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  // Ensure at least one character from each category
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';

  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Validate password strength
 * @param password - The password to validate
 * @returns object - Validation result with strength score and feedback
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  if (password.length >= 12) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one lowercase letter');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one uppercase letter');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one number');
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one special character');
  }

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Password should not contain repeated characters');
    score -= 1;
  }

  if (/123|abc|qwe|password|admin/i.test(password)) {
    feedback.push('Password should not contain common patterns');
    score -= 1;
  }

  const isValid = score >= 4 && feedback.length === 0;

  return {
    isValid,
    score: Math.max(0, Math.min(6, score)),
    feedback,
  };
}
