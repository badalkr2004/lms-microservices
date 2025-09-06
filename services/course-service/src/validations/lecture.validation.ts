// src/validations/lecture.validation.ts
import { z } from 'zod';

export const createLectureSchema = z.object({
  courseId: z.string().uuid(),
  chapterId: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  contentType: z.enum(['video', 'text', 'pdf', 'audio']),
  videoUrl: z.string().url().optional(),
  videoDuration: z.number().int().min(0).optional(),
  pdfUrl: z.string().url().optional(),
  textContent: z.string().optional(),
  isPreview: z.boolean().default(false),
  isDownloadable: z.boolean().default(false),
  sortOrder: z.number().int().min(0),
  videoFile: z
    .object({
      fileName: z.string(),
      fileSize: z.number(),
      contentType: z.string(),
    })
    .optional(),
});

export const attachVideoSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z
    .number()
    .positive()
    .max(5 * 1024 * 1024 * 1024), // 5GB
  contentType: z.string().regex(/^video\//, 'Must be a video file'),
});

export const playbackUrlSchema = z.object({
  signed: z.boolean().default(false),
  expirationHours: z.number().int().min(1).max(168).default(24), // Max 7 days
});

export function validateAttachVideo(data: unknown) {
  return attachVideoSchema.safeParse(data);
}
export function validatePlaybackUrl(data: unknown) {
  return playbackUrlSchema.safeParse(data);
}

export const updateLectureSchema = createLectureSchema.partial().omit({ courseId: true });

export type CreateLectureInput = z.infer<typeof createLectureSchema>;
export type UpdateLectureInput = z.infer<typeof updateLectureSchema>;
