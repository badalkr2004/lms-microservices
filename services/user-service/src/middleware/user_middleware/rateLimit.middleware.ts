// middleware/rateLimit.middleware.ts
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/user.types';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

/**
 * Create rate limit middleware with custom options
 */
export const rateLimitMiddleware = (options: RateLimitOptions) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: options.standardHeaders ?? true,
    legacyHeaders: options.legacyHeaders ?? false,
    
    // Use user ID as the key for authenticated requests
    keyGenerator: (req: Request): string => {
      const authReq = req as AuthenticatedRequest;
      return authReq.user?.userId || req.ip || 'unknown';
    },
    
    // Custom response
    handler: (req: Request, res: Response): void => {
      res.status(429).json({
        success: false,
        message: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
    
    // Skip successful requests in rate limit counting (optional)
    skipSuccessfulRequests: false,
    
    // Skip failed requests in rate limit counting
    skipFailedRequests: false,
  });
};

/**
 * Predefined rate limiters for common use cases
 */

// General API rate limit
export const generalRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests. Please try again later.',
});

// Follow/unfollow specific rate limit
export const followRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 follow/unfollow operations per 15 minutes
  message: 'Too many follow/unfollow requests. Please try again later.',
});

// Profile viewing rate limit (more lenient)
export const profileRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 profile views per 15 minutes
  message: 'Too many profile requests. Please try again later.',
});