// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { AuthenticatedRequest, FileErrorCode } from '../types';

/**
 * Service-to-service authentication middleware
 * Validates API key for internal service communication
 */
export const serviceAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const serviceId = req.headers['x-service-id'] as string;

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: {
          code: FileErrorCode.UNAUTHORIZED,
          message: 'API key is required',
        },
      });
      return;
    }

    if (apiKey !== config.API_KEY) {
      res.status(401).json({
        success: false,
        error: {
          code: FileErrorCode.UNAUTHORIZED,
          message: 'Invalid API key',
        },
      });
      return;
    }

    // Add service information to request
    req.serviceId = serviceId;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: FileErrorCode.INTERNAL_ERROR,
        message: 'Authentication error',
      },
    });
  }
};

/**
 * User authentication middleware (for direct user access)
 * This would typically validate JWT tokens
 */
export const userAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: FileErrorCode.UNAUTHORIZED,
          message: 'Authentication token is required',
        },
      });
      return;
    }

    // TODO: Implement JWT validation logic here
    // For now, we'll extract user info from headers (development only)
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: FileErrorCode.UNAUTHORIZED,
          message: 'User ID is required',
        },
      });
      return;
    }

    req.userId = userId;
    req.userRole = userRole;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: FileErrorCode.INTERNAL_ERROR,
        message: 'Authentication error',
      },
    });
  }
};
