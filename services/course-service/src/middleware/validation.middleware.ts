// src/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../utils/errors';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.issues
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        next(new ValidationError(errorMessage));
      } else {
        next(error);
      }
    }
  };
};

declare global {
  namespace Express {
    interface Request {
      validatedQuery?: any; // better: replace `any` with a generic type
    }
  }
}

export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.query);
      req.validatedQuery = result; // ✅ store validated query
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.issues
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        next(new ValidationError(errorMessage));
      } else {
        next(error);
      }
    }
  };
};
