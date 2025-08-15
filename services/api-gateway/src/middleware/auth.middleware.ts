import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { logger } from '@lms/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    status: string;
    emailVerified: boolean;
  };
}

/**
 * API Gateway authentication middleware
 * Validates tokens with the user service and attaches user data to requests
 */
export const apiGatewayAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';

    // Verify token with user service
    const response = await axios.post(
      `${userServiceUrl}/api/auth-verification/verify-token`,
      { token },
      {
        headers: {
          'x-service-api-key': process.env.API_GATEWAY_SERVICE_KEY,
          'x-service-id': 'api-gateway',
          'x-timestamp': Date.now().toString(),
          'x-signature': generateSignature('api-gateway', Date.now().toString(), { token }),
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    if (response.data.success) {
      // Attach user data to request for downstream services
      req.user = response.data.data.user;

      // Add user info to headers for downstream services
      req.headers['x-user-id'] = req?.user?.id;
      req.headers['x-user-email'] = req?.user?.email;
      req.headers['x-user-role'] = req?.user?.role;

      logger.info('User authenticated via API Gateway', {
        userId: req?.user?.id,
        email: req?.user?.email,
        role: req?.user?.role,
      });

      next();
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    logger.error('API Gateway auth middleware error:', error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
        });
      }
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          message: 'Authentication service unavailable',
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Generate HMAC signature for service-to-service communication
 */
function generateSignature(serviceId: string, timestamp: string, data: any): string {
  const crypto = require('crypto');
  const secretKey = process.env.SERVICE_SECRET_KEY || 'default-secret-key';
  const payload = `${serviceId}:${timestamp}:${JSON.stringify(data)}`;
  return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
}

/**
 * Optional middleware to check if authentication is required for a route
 */
export const conditionalAuth = (req: Request, res: Response, next: NextFunction) => {
  // Define public routes that don't require authentication
  const publicRoutes = [
    '/api/user/auth/login',
    '/api/user/auth/register',
    '/api/user/auth/firebase',
    '/api/course/public',
    '/health',
  ];

  const isPublicRoute = publicRoutes.some(route => req.path.startsWith(route));

  if (isPublicRoute) {
    return next();
  }

  // Apply authentication for protected routes
  return apiGatewayAuthMiddleware(req as AuthenticatedRequest, res, next);
};
