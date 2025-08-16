// src/utils/security.utils.ts
import crypto from 'crypto';

/**
 * Generate secure API key
 */
export const generateApiKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash sensitive data
 */
export const hashData = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generate secure file ID
 */
export const generateSecureFileId = (): string => {
  return crypto.randomUUID();
};

/**
 * Validate file signature (basic validation)
 */
export const validateFileSignature = (buffer: Buffer, mimeType: string): boolean => {
  const signatures: Record<string, Buffer[]> = {
    'image/jpeg': [
      Buffer.from([0xFF, 0xD8, 0xFF]),
    ],
    'image/png': [
      Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    ],
    'image/gif': [
      Buffer.from('GIF87a', 'ascii'),
      Buffer.from('GIF89a', 'ascii'),
    ],
    'image/webp': [
      Buffer.from('WEBP', 'ascii'),
    ],
  };

  const expectedSignatures = signatures[mimeType];
  if (!expectedSignatures) return false;

  return expectedSignatures.some(signature => {
    if (mimeType === 'image/webp') {
      // WebP signature is at offset 8
      return buffer.subarray(8, 8 + signature.length).equals(signature);
    }
    return buffer.subarray(0, signature.length).equals(signature);
  });
};
