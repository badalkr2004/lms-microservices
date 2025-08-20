// src/types/index.ts
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: 'student' | 'teacher' | 'super_admin';
  };
}

export type SortableCourseField =
  | 'title'
  | 'createdAt'
  | 'updatedAt'
  | 'price'
  | 'difficulty'
  | 'status';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: SortableCourseField;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface CourseFilters {
  categoryId?: string;
  teacherId?: string;
  status?: string;
  difficulty?: string;
  pricingType?: string;
  isFeatured?: boolean;
  search?: string;
}

export interface EnrollmentFilters {
  userId?: string;
  courseId?: string;
  status?: string;
}
