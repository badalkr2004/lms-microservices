/**
 * Example usage of password hashing utilities
 * This file demonstrates how to use the password hashing functions
 */

import { 
  hashPassword, 
  verifyPassword, 
  needsRehash, 
  generateSecurePassword, 
  validatePasswordStrength 
} from './password-hash';

async function exampleUsage() {
  console.log('🔐 Password Hashing Examples\n');

  // Example 1: Hash a password
  const plainPassword = 'MySecurePassword123!';
  console.log('1. Hashing a password:');
  console.log(`Plain password: ${plainPassword}`);
  
  try {
    const hashedPassword = await hashPassword(plainPassword);
    console.log(`Hashed password: ${hashedPassword}\n`);

    // Example 2: Verify a password
    console.log('2. Verifying password:');
    const isValid = await verifyPassword(plainPassword, hashedPassword);
    console.log(`Password verification result: ${isValid}\n`);

    // Example 3: Check if password needs rehashing
    console.log('3. Checking if password needs rehashing:');
    const needsRehashing = needsRehash(hashedPassword);
    console.log(`Needs rehashing: ${needsRehashing}\n`);

  } catch (error) {
    console.error('Error during password hashing:', error);
  }

  // Example 4: Generate a secure password
  console.log('4. Generating secure passwords:');
  const generatedPassword = generateSecurePassword(16);
  console.log(`Generated password: ${generatedPassword}\n`);

  // Example 5: Validate password strength
  console.log('5. Password strength validation:');
  const passwords = [
    'weak',
    'StrongerPass123',
    'VerySecurePassword123!@#'
  ];

  for (const pwd of passwords) {
    const validation = validatePasswordStrength(pwd);
    console.log(`Password: "${pwd}"`);
    console.log(`Valid: ${validation.isValid}, Score: ${validation.score}/6`);
    if (validation.feedback.length > 0) {
      console.log(`Feedback: ${validation.feedback.join(', ')}`);
    }
    console.log('---');
  }
}

// Uncomment to run the example
// exampleUsage().catch(console.error);

export { exampleUsage };
