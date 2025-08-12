# Password Hashing Utility

A secure password hashing utility built with bcrypt for the LMS backend system.

## Features

- **Secure Password Hashing**: Uses bcrypt with configurable salt rounds (default: 12)
- **Password Verification**: Compare plain text passwords with hashed passwords
- **Rehashing Detection**: Check if existing hashes need to be updated
- **Password Generation**: Generate cryptographically secure random passwords
- **Password Strength Validation**: Validate password complexity and provide feedback

## Installation

Make sure to install the required dependencies:

```js
pnpm add bcrypt
pnpm add -D @types/bcrypt
```

## Usage

### Basic Password Hashing

```typescript
import { hashPassword, verifyPassword } from '@lms/database';

// Hash a password
const plainPassword = 'MySecurePassword123!';
const hashedPassword = await hashPassword(plainPassword);

// Verify a password
const isValid = await verifyPassword(plainPassword, hashedPassword);
console.log(isValid); // true
```

### Password Strength Validation

```typescript
import { validatePasswordStrength } from '@lms/database';

const validation = validatePasswordStrength('MyPassword123!');
console.log(validation.isValid); // true/false
console.log(validation.score); // 0-6
console.log(validation.feedback); // Array of improvement suggestions
```

### Generate Secure Passwords

```typescript
import { generateSecurePassword } from '@lms/database';

const password = generateSecurePassword(16); // 16 characters
console.log(password); // e.g., "K9#mP2$vX8@nQ5!z"
```

### Check for Rehashing

```typescript
import { needsRehash } from '@lms/database';

const shouldRehash = needsRehash(existingHash);
if (shouldRehash) {
  const newHash = await hashPassword(plainPassword);
  // Update database with newHash
}
```

## Security Features

### Salt Rounds

- Default: 12 rounds (recommended for 2024)
- Configurable via the `SALT_ROUNDS` constant
- Higher rounds = more secure but slower

### Password Requirements

- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character
- No common patterns (123, abc, password, etc.)
- No excessive character repetition

### Error Handling

- Graceful error handling for verification failures
- Input validation for empty/invalid passwords
- Secure error messages that don't leak information

## API Reference

### `hashPassword(password: string): Promise<string>`

Hashes a plain text password using bcrypt.

**Parameters:**

- `password` - The plain text password to hash

**Returns:** Promise resolving to the hashed password

**Throws:** Error if password is empty or too short

### `verifyPassword(password: string, hashedPassword: string): Promise<boolean>`

Verifies a plain text password against a hashed password.

**Parameters:**

- `password` - The plain text password
- `hashedPassword` - The hashed password to compare against

**Returns:** Promise resolving to true if passwords match

### `needsRehash(hashedPassword: string): boolean`

Checks if a password hash needs to be rehashed (e.g., if salt rounds increased).

**Parameters:**

- `hashedPassword` - The existing hashed password

**Returns:** Boolean indicating if rehashing is needed

### `generateSecurePassword(length?: number): string`

Generates a cryptographically secure random password.

**Parameters:**

- `length` - Password length (default: 16)

**Returns:** A randomly generated password

### `validatePasswordStrength(password: string): ValidationResult`

Validates password strength and provides feedback.

**Parameters:**

- `password` - The password to validate

**Returns:** Object with `isValid`, `score`, and `feedback` properties

## Best Practices

1. **Always hash passwords** before storing in database
2. **Never log or expose** plain text passwords
3. **Use HTTPS** when transmitting passwords
4. **Implement rate limiting** for login attempts
5. **Consider password history** to prevent reuse
6. **Regular security audits** of password policies

## Example Integration

```typescript
// In your authentication service
import { hashPassword, verifyPassword } from '@lms/database';

export class AuthService {
  async registerUser(email: string, password: string) {
    // Validate password strength first
    const validation = validatePasswordStrength(password);
    if (!validation.isValid) {
      throw new Error(`Password requirements not met: ${validation.feedback.join(', ')}`);
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Store user with hashed password
    await db.insert(users).values({
      email,
      passwordHash,
      // ... other fields
    });
  }

  async loginUser(email: string, password: string) {
    // Get user from database
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user.length) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await verifyPassword(password, user[0].passwordHash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Check if password needs rehashing
    if (needsRehash(user[0].passwordHash)) {
      const newHash = await hashPassword(password);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user[0].id));
    }

    return user[0];
  }
}
```

## Security Considerations

- **Timing Attacks**: The verification function uses bcrypt's constant-time comparison
- **Salt Generation**: Each password gets a unique salt automatically
- **Memory Protection**: Sensitive data is not logged or exposed in error messages
- **Future-Proofing**: Easy to increase salt rounds as computing power grows

## Testing

Run the example file to test the functionality:

```typescript
import { exampleUsage } from './password-hash.example';
await exampleUsage();
```
