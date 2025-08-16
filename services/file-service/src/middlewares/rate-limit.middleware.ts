// src/middleware/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';
import { fileConfig } from '../config';

/**
 * Rate limiting for file uploads
 */
export const uploadRateLimit = rateLimit({
  windowMs: fileConfig.rateLimitWindowMs,
  max: fileConfig.rateLimitMaxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many upload requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting for general API requests
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
