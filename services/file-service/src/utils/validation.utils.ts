// src/utils/validation.utils.ts
import { muxConfig } from '@/config';
import { z } from 'zod';

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * File size validation
 */
export const validateFileSize = (size: number, maxSize: number = 5 * 1024 * 1024): boolean => {
  return size > 0 && size <= maxSize;
};

/**
 * Validate image dimensions (if provided)
 */
export const imageDimensionsSchema = z
  .object({
    width: z.number().min(1).max(10000),
    height: z.number().min(1).max(10000),
  })
  .optional();

/**
 * Common pagination schema
 */
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const isValidVideoType = (contentType: string): boolean => {
  return muxConfig.SUPPORTED_VIDEO_FORMATS.includes(contentType);
};
