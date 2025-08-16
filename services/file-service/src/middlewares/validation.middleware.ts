// src/middleware/validation.middleware.ts
import { z } from 'zod';
import { NextFunction, Response, Request } from 'express';
import { FileErrorCode } from '@/types';
/**
 * Generic validation middleware factory
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
        console.log(req.body);
      const validation = schema.safeParse(req.body);
      
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: FileErrorCode.INVALID_REQUEST,
            message: 'Validation failed',
            details: validation.error.issues,
          },
        });
        return;
      }

      req.body = validation.data;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: FileErrorCode.INTERNAL_ERROR,
          message: 'Validation error',
        },
      });
    }
  };
};

/**
 * File upload validation middleware
 */
export const validateFileUpload = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { fileType, fileSize } = req.body;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(fileType)) {
      res.status(400).json({
        success: false,
        error: {
          code: FileErrorCode.INVALID_FILE_TYPE,
          message: `File type ${fileType} is not allowed`,
          details: { allowedTypes },
        },
      });
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (fileSize > maxSize) {
      res.status(400).json({
        success: false,
        error: {
          code: FileErrorCode.FILE_TOO_LARGE,
          message: `File size ${fileSize} exceeds maximum allowed size`,
          details: { maxSize },
        },
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: FileErrorCode.INTERNAL_ERROR,
        message: 'File validation error',
      },
    });
  }
};
