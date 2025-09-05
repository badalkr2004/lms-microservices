// controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UserRepository } from '../repository/user.repository';
import {
  UserProfileSchema,
  FollowRequestSchema,
  UserNotFoundError,
  UnauthorizedError,
  InvalidRoleError,
  AlreadyFollowingError,
  NotFollowingError,
  type AuthenticatedRequest,
} from '../types/user.types';
import { z } from 'zod';

export class UserController {
  public userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Get student profile
   * GET /api/users/profile
   * Returns: name, email, avatar url, number of teachers following
   */
  getProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const profile = await this.userRepository.getUserProfile(req.user?.userId as string);

      if (!profile) {
        throw new UserNotFoundError();
      }

      // Validate response data
      const validatedProfile = UserProfileSchema.parse(profile);

      res.status(200).json({
        success: true,
        data: validatedProfile,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user profile
   * POST /api/users/profile
   * Returns: updated profile
   */
  // updateProfile = async (
  //   req: AuthenticatedRequest,
  //   res: Response,
  //   next: NextFunction
  // ): Promise<void> => {

  // };

  /**
   * Get user list with pagination
   * GET /api/users/user-list
   */
  getUserList = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { page, limit, search, role } = req.query as {
        page: string;
        limit: string;
        search: string;
        role: 'student' | 'teacher' | undefined;
      };
      const users = await this.userRepository.getUsersLists(
        parseInt(page, 10) || 1,
        parseInt(limit, 10) || 10,
        search,
        role || 'student'
      );
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Follow a teacher
   * POST /api/users/follow
   */
  followTeacher = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request body
      const { teacherId } = FollowRequestSchema.parse(req.body);

      // Security check: Only students can follow
      if (req.user?.role !== 'student') {
        throw new InvalidRoleError('Only students can follow teachers');
      }

      // Prevent self-following
      if (req.user.userId === teacherId) {
        throw new InvalidRoleError('Cannot follow yourself');
      }

      // Validate the follow operation
      await this.userRepository.validateFollowOperation(req.user.userId, teacherId);

      // Check if already following
      const isAlreadyFollowing = await this.userRepository.isFollowing(req.user.userId, teacherId);

      if (isAlreadyFollowing) {
        throw new AlreadyFollowingError();
      }

      // Perform follow operation
      await this.userRepository.followTeacher(req.user.userId, teacherId);

      // Get updated profile to return new following count
      const updatedProfile = await this.userRepository.getUserProfile(req.user.userId);

      res.status(201).json({
        success: true,
        message: 'Successfully followed teacher',
        followingCount: updatedProfile?.followingCount || 0,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Unfollow a teacher
   * DELETE /api/users/unfollow
   */
  unfollowTeacher = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Validate request body
      const { teacherId } = FollowRequestSchema.parse(req.body);

      // Security check: Only students can unfollow
      if (req.user?.role !== 'student') {
        throw new InvalidRoleError('Only students can unfollow teachers');
      }

      // Prevent self-unfollowing
      if (req.user?.userId === teacherId) {
        throw new InvalidRoleError('Cannot unfollow yourself');
      }

      // Check if currently following
      const isFollowing = await this.userRepository.isFollowing(req.user?.userId, teacherId);

      if (!isFollowing) {
        throw new NotFollowingError();
      }

      // Perform unfollow operation
      const unfollowed = await this.userRepository.unfollowTeacher(req.user?.userId, teacherId);

      if (!unfollowed) {
        throw new NotFollowingError('Failed to unfollow - relationship not found');
      }

      // Get updated profile to return new following count
      const updatedProfile = await this.userRepository.getUserProfile(req.user?.userId);

      res.status(200).json({
        success: true,
        message: 'Successfully unfollowed teacher',
        followingCount: updatedProfile?.followingCount || 0,
      });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Global error handler for user-related operations
 */
export const handleUserErrors = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('User operation error:', error);

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
    return;
  }

  // Handle custom errors
  if (error instanceof UserNotFoundError) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (error instanceof UnauthorizedError) {
    res.status(403).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (
    error instanceof InvalidRoleError ||
    error instanceof AlreadyFollowingError ||
    error instanceof NotFollowingError
  ) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
    return;
  }

  // Handle database constraint errors
  if (error.message.includes('unique')) {
    res.status(409).json({
      success: false,
      message: 'Resource conflict - operation already exists',
    });
    return;
  }

  // Generic server error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
