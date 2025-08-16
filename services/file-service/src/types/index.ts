// src/types/index.ts
import { z } from 'zod';
import { Request } from 'express';

// File Upload Request Schema
export const uploadRequestSchema = z.object({
  fileName: z.string()
    .min(1, 'File name is required')
    .max(255, 'File name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid file name format'),
  fileType: z.string()
    .regex(/^image\/(jpeg|jpg|png|webp|gif)$/, 'Invalid file type'),
  fileSize: z.number()
    .positive('File size must be positive')
    .max(5 * 1024 * 1024, 'File size too large (max 5MB)'),
  userId: z.string().uuid('Invalid user ID'),
  category: z.enum(['profile', 'course', 'assignment', 'general']).default('general'),
});

// Presigned URL Request Schema
export const presignedUrlRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string(),
  fileSize: z.number().positive(),
  userId: z.string().uuid(),
  category: z.enum(['profile', 'course', 'assignment', 'general']).default('general'),
});

// File Metadata Schema
export const fileMetadataSchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  s3Key: z.string(),
  s3Url: z.string(),
  userId: z.string().uuid(),
  category: z.string(),
  uploadedAt: z.date(),
  isActive: z.boolean().default(true),
});

// Response Schemas
export const uploadResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    fileId: z.string().uuid(),
    fileName: z.string(),
    fileUrl: z.string().url(),
    s3Key: z.string(),
    uploadedAt: z.string(),
  }),
  message: z.string(),
});

export const presignedUrlResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    uploadUrl: z.string().url(),
    fileId: z.string().uuid(),
    s3Key: z.string(),
    expiresIn: z.number(),
  }),
  message: z.string(),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});

// Type exports
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type PresignedUrlRequest = z.infer<typeof presignedUrlRequestSchema>;
export type FileMetadata = z.infer<typeof fileMetadataSchema>;
export type UploadResponse = z.infer<typeof uploadResponseSchema>;
export type PresignedUrlResponse = z.infer<typeof presignedUrlResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// File Upload Status
export enum FileUploadStatus {
  PENDING = 'pending',
  UPLOADED = 'uploaded',
  FAILED = 'failed',
  DELETED = 'deleted',
}

// File Categories
export enum FileCategory {
  PROFILE = 'profile',
  COURSE = 'course',
  ASSIGNMENT = 'assignment',
  GENERAL = 'general',
}

// Error Codes
export enum FileErrorCode {
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  S3_ERROR = 'S3_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// Extended Express Request
export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  serviceId?: string;
}