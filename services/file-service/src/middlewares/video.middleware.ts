// src/middlewares/video.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { WebhookUtils } from '../utils/webhook.utils';
import { createLogger } from '../utils/logger';
import { config } from '../config';

const logger = createLogger('VideoMiddleware');

/**
 * Middleware to verify Mux webhook signatures
 */
export const verifyMuxWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['mux-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (!signature) {
      throw new AppError('Missing webhook signature', 401);
    }

    const isValid = WebhookUtils.verifyMuxSignature(
      payload,
      signature,
      config.MUX_WEBHOOK_SECRET
    );

    if (!isValid) {
      logger.warn('Invalid webhook signature', { 
        signature: signature.substring(0, 10) + '...' 
      });
      throw new AppError('Invalid webhook signature', 401);
    }

    // Validate timestamp freshness
    const isTimestampValid = WebhookUtils.validateWebhookTimestamp(
      req.body.created_at,
      300 // 5 minutes tolerance
    );

    if (!isTimestampValid) {
      throw new AppError('Webhook timestamp too old', 401);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to validate video file constraints
 */
export const validateVideoFile = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileSize, contentType } = req.body;

    if (!fileSize || !contentType) {
      throw new AppError('File size and content type required', 400);
    }

    // Check file size
    if (fileSize > config.MAX_VIDEO_SIZE) {
      throw new AppError(
        `File size exceeds maximum limit of ${Math.floor(config.MAX_VIDEO_SIZE / (1024 * 1024 * 1024))}GB`,
        400
      );
    }

    // Check content type
    if (!config.SUPPORTED_VIDEO_FORMATS.includes(contentType.toLowerCase())) {
      throw new AppError(`Unsupported video format: ${contentType}`, 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check user permissions for video operations
 */
export const checkVideoPermissions = (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (!userId) {
      throw new AppError('User authentication required', 401);
    }

    // For webhook endpoints, skip user validation
    if (req.path.includes('/webhook')) {
      return next();
    }

    // Check if user has permission to upload videos
    if (!['teacher', 'super_admin'].includes(userRole) && req.method === 'POST') {
      throw new AppError('Insufficient permissions to upload videos', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// src/middlewares/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { AppError } from '../utils/errors';

export const validateRequest = (schema: Schema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property]);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(errorMessage, 400));
    }
    
    req[property] = value;
    next();
  };
};

// src/routes/index.ts - Update to include video routes
import { Router } from 'express';
import videoRoutes from './video.routes';
// ... your other route imports

const router = Router();

// Mount video routes
router.use('/videos', videoRoutes);

// ... your other routes

export default router;