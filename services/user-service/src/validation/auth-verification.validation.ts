import { z } from 'zod';

export const verifyTokenSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
  }),
});

export const checkPermissionsSchema = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid user ID format'),
    resource: z.string().min(1, 'Resource is required'),
    action: z.string().min(1, 'Action is required'),
    context: z.record(z.string(), z.any()).optional(),
  }),
});

export const getUserProfileSchema = z.object({
  params: z.object({
    userId: z.string().min(1, 'User ID is required'),
  }),
});
