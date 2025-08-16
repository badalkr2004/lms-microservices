// src/utils/response.utils.ts
import { Response } from 'express';
import { ErrorResponse, FileErrorCode } from '../types';

/**
 * Standard success response helper
 */
export const sendSuccessResponse = (
  res: Response, 
  data: any, 
  message: string = 'Success',
  statusCode: number = 200
): void => {
  res.status(statusCode).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Standard error response helper
 */
export const sendErrorResponse = (
  res: Response,
  code: FileErrorCode,
  message: string,
  statusCode: number = 400,
  details?: any
): void => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  
  res.status(statusCode).json(errorResponse);
};

/**
 * Validation error response helper
 */
export const sendValidationErrorResponse = (
  res: Response,
  errors: any[]
): void => {
  sendErrorResponse(
    res,
    FileErrorCode.INVALID_REQUEST,
    'Validation failed',
    400,
    { validationErrors: errors }
  );
};