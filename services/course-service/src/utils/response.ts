// src/utils/response.ts
import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

export const successResponse = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
};

export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  error?: string
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    error,
  };
  return res.status(statusCode).json(response);
};

export const paginatedResponse = <T>(
  res: Response,
  message: string,
  data: T[],
  pagination: PaginatedResponse<T>['pagination'],
  statusCode: number = 200
): Response => {
  const response: PaginatedResponse<T> & { success: boolean; message: string } = {
    success: true,
    message,
    data,
    pagination,
  };
  return res.status(statusCode).json(response);
};
