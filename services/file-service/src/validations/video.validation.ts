// src/validations/video.validation.ts
import { z } from "zod";

export const videoUploadSchema = z.object({
  courseId: z.string().uuid(),
  lectureId: z.string().uuid().optional(),
  fileName: z.string().min(1).max(255),
  fileSize: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 * 1024 * 1024), // Max 5GB
  contentType: z.enum([
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-ms-wmv",
    "video/webm",
    "video/x-flv",
    "video/3gpp",
    "video/x-matroska",
  ]),
});

export const videoStatusSchema = z.object({
  fileId: z.string().uuid(),
});

export const signedUrlSchema = z.object({
  expirationHours: z.number().int().min(1).max(168).default(24), // Max 1 week
});

export const thumbnailSchema = z.object({
  time: z.number().min(0).optional(), // Time in seconds
});

export const bulkProcessSchema = z.object({
  videoIds: z.array(z.string().uuid()).min(1).max(50),
});

export const webhookSchema = z
  .object({
    type: z.string(),
    created_at: z.string().datetime(), // ISO date
    data: z
      .object({
        id: z.string().optional(),
        asset_id: z.string().optional(),
        status: z.string().optional(),
        passthrough: z.string().optional(),
        errors: z.array(z.string()).optional(),
        error: z.string().optional(),
      })
      .passthrough(), // allow unknown fields
    object: z.object({}).passthrough(),
    id: z.string(),
    environment: z.object({}).passthrough(),
    request_id: z.string().nullable().optional(),
    accessor: z.string().nullable().optional(),
    accessor_source: z.string().nullable().optional(),
  })
  .passthrough();

export const listVideosSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: z
    .enum(["pending", "uploading", "processing", "completed", "failed"])
    .optional(),
  courseId: z.string().uuid().optional(),
});

// Validation helper functions
export const validateVideoUpload = (data: any) => videoUploadSchema.safeParse(data);
export const validateVideoStatus = (data: any) => videoStatusSchema.safeParse(data);
export const validateSignedUrl = (data: any) => signedUrlSchema.safeParse(data);
export const validateThumbnail = (data: any) => thumbnailSchema.safeParse(data);
export const validateBulkProcess = (data: any) => bulkProcessSchema.safeParse(data);
export const validateWebhook = (data: any) => webhookSchema.safeParse(data);
export const validateListVideos = (data: any) => listVideosSchema.safeParse(data);
