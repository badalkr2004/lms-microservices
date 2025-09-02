// src/config/index.ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  // Server Config
  PORT: z.string().default('3008'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // AWS Config
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_S3_BUCKET: z.string().min(1, 'AWS_S3_BUCKET is required'),
  AWS_S3_BUCKET_URL: z.string().url('AWS_S3_BUCKET_URL must be a valid URL'),

  // File Upload Config
  MAX_FILE_SIZE: z.string().default('5242880'), // 5MB in bytes
  ALLOWED_IMAGE_TYPES: z.string().default('image/jpeg,image/png,image/webp,image/gif'),
  PRESIGNED_URL_EXPIRY: z.string().default('3600'), // 1 hour in seconds

  // Security Config
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // Database Config (if needed for file metadata)
  DATABASE_URL: z.string().optional(),

  // Service Communication
  API_KEY: z.string().min(1, 'API_KEY is required for service-to-service communication'),
  USER_SERVICE_URL: z.string().url().optional(),
});

const parseConfig = () => {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.issues.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Configuration validation failed:\n${missingFields.join('\n')}`);
    }
    throw error;
  }
};

export const config = parseConfig();

export const fileConfig = {
  maxFileSize: parseInt(config.MAX_FILE_SIZE, 10),
  allowedImageTypes: config.ALLOWED_IMAGE_TYPES.split(','),
  presignedUrlExpiry: parseInt(config.PRESIGNED_URL_EXPIRY, 10),
  rateLimitWindowMs: parseInt(config.RATE_LIMIT_WINDOW_MS, 10),
  rateLimitMaxRequests: parseInt(config.RATE_LIMIT_MAX_REQUESTS, 10),
} as const;

export const awsConfig = {
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
  bucket: config.AWS_S3_BUCKET,
  bucketUrl: config.AWS_S3_BUCKET_URL,
} as const;

export const muxConfig = {
  MUX_TOKEN_ID: process.env.MUX_TOKEN_ID || '',
  MUX_TOKEN_SECRET: process.env.MUX_TOKEN_SECRET || '',
  MUX_SIGNING_KEY_ID: process.env.MUX_SIGNING_KEY_ID || '',
  MUX_SIGNING_KEY_PRIVATE: process.env.MUX_SIGNING_KEY_PRIVATE || '',
  MUX_WEBHOOK_SECRET: process.env.MUX_WEBHOOK_SECRET || '',
  MUX_ENVIRONMENT_ID: process.env.MUX_ENVIRONMENT_ID || '',

  // Video Processing Configuration
  MAX_VIDEO_SIZE: parseInt(process.env.MAX_VIDEO_SIZE || '5368709120'), // 5GB in bytes
  SUPPORTED_VIDEO_FORMATS: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/webm',
    'video/x-flv',
    'video/3gpp',
    'video/x-matroska',
  ],
  VIDEO_UPLOAD_TIMEOUT: parseInt(process.env.VIDEO_UPLOAD_TIMEOUT || '3600'), // 1 hour
  DEFAULT_VIDEO_EXPIRATION: parseInt(process.env.DEFAULT_VIDEO_EXPIRATION || '86400'), // 24 hours

  // CORS Configuration for Mux uploads
  CORS_ORIGIN: process.env.MUX_CORS_ORIGIN || 'http://127.0.0.1:5500',
};
