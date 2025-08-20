import { Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { db, users, userProfiles } from '@lms/database';
import { eq } from 'drizzle-orm';
import { logger } from '@lms/logger';
import { HttpStatus, sendError, sendSuccess } from '@lms/common';

export class AuthVerificationController {
  /**
   * Verify token and return user data for inter-service communication
   * This endpoint is called by other services to validate user tokens
   */
  async verifyToken(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return sendError(res, 'Token is required', HttpStatus.BAD_REQUEST);
      }

      // Verify the JWT token
      const decoded = verifyAccessToken(token);

      // Fetch user details from database
      const userResult = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          status: users.status,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, decoded.userId))
        .limit(1);

      if (userResult.length === 0) {
        return sendError(res, 'User not found', HttpStatus.NOT_FOUND);
      }

      const user = userResult[0];

      // Check if user is active
      if (user.status !== 'active') {
        return sendError(res, 'User account is not active', HttpStatus.FORBIDDEN);
      }

      // Return user data for the requesting service
      console.log('token verified');
      return sendSuccess(
        res,
        {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
          },
          tokenPayload: decoded,
        },
        'Token verified successfully'
      );
    } catch (error) {
      logger.error('Token verification error:', error);

      if (error instanceof Error && error.message.includes('Invalid')) {
        return sendError(res, 'Invalid or expired token', HttpStatus.UNAUTHORIZED);
      }

      return sendError(res, 'Token verification failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Check if user has specific permissions for a resource
   * Used by other services for authorization
   */
  async checkPermissions(req: Request, res: Response) {
    try {
      const { userId, resource, action, context } = req.body;

      if (!userId || !resource || !action) {
        return sendError(res, 'userId, resource, and action are required', HttpStatus.BAD_REQUEST);
      }

      // Fetch user with role
      const userResult = await db
        .select({
          id: users.id,
          role: users.role,
          status: users.status,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        return sendError(res, 'User not found', HttpStatus.NOT_FOUND);
      }

      const user = userResult[0];

      if (user.status !== 'active') {
        return sendError(res, 'User account is not active', HttpStatus.FORBIDDEN);
      }

      // Check permissions based on role and resource
      const hasPermission = await this.evaluatePermissions(user.role, resource, action, context);

      return sendSuccess(
        res,
        {
          userId,
          resource,
          action,
          hasPermission,
          userRole: user.role,
        },
        'Permission check completed'
      );
    } catch (error) {
      logger.error('Permission check error:', error);
      return sendError(res, 'Permission check failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get user profile data for other services
   */
  async getUserProfile(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return sendError(res, 'User ID is required', HttpStatus.BAD_REQUEST);
      }

      // Fetch user with profile
      const userResult = await db
        .select({
          user: {
            id: users.id,
            email: users.email,
            role: users.role,
            status: users.status,
            emailVerified: users.emailVerified,
          },
          profile: {
            firstName: userProfiles.firstName,
            lastName: userProfiles.lastName,
            bio: userProfiles.bio,
          },
        })
        .from(users)
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        return sendError(res, 'User not found', HttpStatus.NOT_FOUND);
      }

      const result = userResult[0];

      return sendSuccess(
        res,
        {
          user: result.user,
          profile: result.profile,
        },
        'User profile retrieved successfully'
      );
    } catch (error) {
      logger.error('Get user profile error:', error);
      return sendError(res, 'Failed to retrieve user profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Evaluate permissions based on RBAC
   */
  private async evaluatePermissions(
    role: string,
    resource: string,
    action: string,
    context?: any
  ): Promise<boolean> {
    // Define role-based permissions
    const permissions: Record<string, Record<string, string[]>> = {
      admin: {
        '*': ['*'], // Admin has all permissions
      },
      teacher: {
        courses: ['create', 'read', 'update', 'delete'],
        assessments: ['create', 'read', 'update', 'delete'],
        students: ['read'],
        analytics: ['read'],
        'live-sessions': ['create', 'read', 'update', 'delete'],
        files: ['create', 'read', 'update', 'delete'],
      },
      student: {
        courses: ['read'],
        assessments: ['read', 'submit'],
        profile: ['read', 'update'],
        'live-sessions': ['read', 'join'],
        files: ['read'],
        payments: ['create', 'read'],
      },
      guest: {
        courses: ['read'],
        public: ['read'],
      },
    };

    const rolePermissions = permissions[role];

    if (!rolePermissions) {
      return false;
    }

    // Check if role has admin privileges
    if (rolePermissions['*'] && rolePermissions['*'].includes('*')) {
      return true;
    }

    // Check specific resource permissions
    const resourcePermissions = rolePermissions[resource];

    if (!resourcePermissions) {
      return false;
    }

    // Check if action is allowed
    return resourcePermissions.includes(action) || resourcePermissions.includes('*');
  }
}
