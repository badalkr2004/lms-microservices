import { Request, Response, NextFunction } from 'express';
import { AuthClient } from '../auth-client';
import { logger } from '@lms/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    status: string;
    emailVerified: boolean;
  };
}

/**
 * Create authentication middleware for microservices
 */
export function createAuthMiddleware(authClient: AuthClient) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access token required',
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token with user service
      const verificationResult = await authClient.verifyToken(token);

      // Attach user data to request
      req.user = verificationResult.user;

      logger.info('User authenticated successfully', {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
      });

      next();
    } catch (error) {
      logger.error('Authentication failed:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  };
}

/**
 * Create authorization middleware for role-based access control
 */
export function createAuthorizationMiddleware(
  authClient: AuthClient,
  resource: string,
  action: string
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Check permissions with user service
      const permissionResult = await authClient.checkPermissions(req.user.id, resource, action, {
        params: req.params,
        query: req.query,
      });

      if (!permissionResult.hasPermission) {
        logger.warn('Authorization failed', {
          userId: req.user.id,
          resource,
          action,
          userRole: req.user.role,
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }

      logger.info('User authorized successfully', {
        userId: req.user.id,
        resource,
        action,
        userRole: req.user.role,
      });

      next();
    } catch (error) {
      logger.error('Authorization check failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
      });
    }
  };
}

/**
 * Create combined auth + authorization middleware
 */
export function createProtectedRoute(authClient: AuthClient, resource: string, action: string) {
  const authMiddleware = createAuthMiddleware(authClient);
  const authzMiddleware = createAuthorizationMiddleware(authClient, resource, action);

  return [authMiddleware, authzMiddleware];
}
