import { Response } from 'express';

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: any;
}

/**
 * Send a success response
 */
export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message = 'Success',
  statusCode = 200
): Response => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
};

/**
 * Send an error response
 */
export const sendError = (
  res: Response,
  message = 'An error occurred',
  statusCode = 500,
  error?: any
): Response => {
  return res.status(statusCode).json({
    status: 'error',
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined,
  });
};
