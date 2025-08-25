// types/user.types.ts
import { z } from 'zod';
import { Request } from 'express';

// User profile response type (student only)
export const UserProfileSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  displayName: z.string().nullable(),
  email: z.string().email(),
  avatarUrl: z.string().url().nullable(),
  followingCount: z.number().min(0),
});

// Follow/Unfollow request validation
export const FollowRequestSchema = z.object({
  teacherId: z.string().uuid('Invalid teacher ID format'),
});

// Response schemas
export const FollowResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  followingCount: z.number(),
});

// Type exports
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type FollowRequest = z.infer<typeof FollowRequestSchema>;
export type FollowResponse = z.infer<typeof FollowResponseSchema>;

// Error types
export class UserNotFoundError extends Error {
  constructor(message = 'User not found') {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class InvalidRoleError extends Error {
  constructor(message = 'Invalid role for this operation') {
    super(message);
    this.name = 'InvalidRoleError';
  }
}

export class AlreadyFollowingError extends Error {
  constructor(message = 'Already following this user') {
    super(message);
    this.name = 'AlreadyFollowingError';
  }
}

export class NotFollowingError extends Error {
  constructor(message = 'Not following this user') {
    super(message);
    this.name = 'NotFollowingError';
  }
}

// Request context type (assuming you have auth middleware)
export interface AuthenticatedRequest extends Request{
  user: {
    id: string;
    email: string;
    role: 'student' | 'teacher';
  };
}