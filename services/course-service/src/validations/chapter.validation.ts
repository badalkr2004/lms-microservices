// src/validations/chapter.validation.ts
import { z } from 'zod';

export const createChapterSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateChapterSchema = createChapterSchema.partial().omit({ courseId: true });

export const reorderChaptersSchema = z.object({
  chapters: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ),
});

export type CreateChapterInput = z.infer<typeof createChapterSchema>;
export type UpdateChapterInput = z.infer<typeof updateChapterSchema>;
export type ReorderChaptersInput = z.infer<typeof reorderChaptersSchema>;
