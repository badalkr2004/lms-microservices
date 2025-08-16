// src/middleware/error.middleware.ts
import { config } from '@/config';
import { FileErrorCode } from '@/types';
import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}
/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  // Default error response
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || FileErrorCode.INTERNAL_ERROR;
  let message = err.message || 'Internal server error';

  // Handle specific error types
  if (err.message === FileErrorCode.S3_ERROR) {
    statusCode = 502;
    errorCode = FileErrorCode.S3_ERROR;
    message = 'Storage service error';
  }

  if (err.message === FileErrorCode.FILE_NOT_FOUND) {
    statusCode = 404;
    errorCode = FileErrorCode.FILE_NOT_FOUND;
    message = 'File not found';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(config.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

/**
 * 404 handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};