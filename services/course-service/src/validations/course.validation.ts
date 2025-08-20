// src/validations/course.validation.ts
import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  thumbnailUrl: z.string().url().optional(),
  trailerVideoUrl: z.string().url().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('beginner'),
  pricingType: z.enum(['free', 'paid', 'subscription']).default('free'),
  price: z.number().min(0).default(0),
  discountPrice: z.number().min(0).optional(),
  language: z.string().default('en'),
  prerequisites: z.string().optional(),
  whatYouLearn: z.array(z.string()).optional(),
  targetAudience: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  maxStudents: z.number().positive().optional(),
  certificateAvailable: z.boolean().default(false),
});

export const updateCourseSchema = createCourseSchema.partial();

export const courseQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  categoryId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  status: z.enum(['draft', 'published', 'archived', 'under_review']).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  pricingType: z.enum(['free', 'paid', 'subscription']).optional(),
  isFeatured: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CourseQuery = z.infer<typeof courseQuerySchema>;
