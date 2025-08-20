// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { errorResponse } from '../utils/response';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return errorResponse(
      res,
      err.message,
      err.statusCode,
      process.env.NODE_ENV === 'development' ? err.stack : undefined
    );
  }

  // Handle specific database errors
  if (err.message.includes('duplicate key value')) {
    return errorResponse(res, 'Resource already exists', 409);
  }

  if (err.message.includes('foreign key constraint')) {
    return errorResponse(res, 'Referenced resource not found', 400);
  }

  // Default error
  return errorResponse(
    res,
    'Internal server error',
    500,
    process.env.NODE_ENV === 'development' ? err.message : undefined
  );
};

export const notFound = (req: Request, res: Response) => {
  errorResponse(res, 'Route not found', 404);
};
