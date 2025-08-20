// src/controllers/course.controller.ts
import { Request, Response, NextFunction } from 'express';
import { CourseService } from '../services/course.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { CourseFilters } from '../types';
import { AuthenticatedRequest } from '@lms/shared-auth';
import { getPaginationParams } from '../utils/pagination';
import { ForbiddenError } from '@/utils/errors';

export class CourseController {
  constructor(private courseService: CourseService) {}

  createCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const course = await this.courseService.createCourse(req.user?.id, req.body);
      successResponse(res, 'Course created successfully', course, 201);
    } catch (error) {
      next(error);
    }
  };

  getCourses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paginationParams = getPaginationParams(req.validatedQuery);

      const filters: CourseFilters = {
        categoryId: req.query.categoryId as string,
        teacherId: req.query.teacherId as string,
        status: req.query.status as string,
        difficulty: req.query.difficulty as string,
        pricingType: req.query.pricingType as string,
        isFeatured: req.query.isFeatured === 'true',
        search: req.query.search as string,
      };

      const userRole = (req as any).user?.role;
      const { courses, pagination } = await this.courseService.getCourses(
        filters,
        paginationParams,
        userRole
      );

      paginatedResponse(res, 'Courses retrieved successfully', courses, pagination);
    } catch (error) {
      next(error);
    }
  };

  getCourseById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      const course = await this.courseService.getCourseById(id, userId, userRole);
      successResponse(res, 'Course retrieved successfully', course);
    } catch (error) {
      next(error);
    }
  };

  updateCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { id } = req.params;
      const course = await this.courseService.updateCourse(
        id,
        req.body,
        req.user.id,
        req.user.role
      );
      successResponse(res, 'Course updated successfully', course);
    } catch (error) {
      next(error);
    }
  };

  deleteCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { id } = req.params;
      await this.courseService.deleteCourse(id, req.user.id, req.user.role);
      successResponse(res, 'Course deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  publishCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { id } = req.params;
      const course = await this.courseService.publishCourse(id, req.user.id, req.user.role);
      successResponse(res, 'Course published successfully', course);
    } catch (error) {
      next(error);
    }
  };

  getFeaturedCourses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
      const { courses } = await this.courseService.getFeaturedCourses(limit);
      successResponse(res, 'Featured courses retrieved successfully', courses);
    } catch (error) {
      next(error);
    }
  };

  getTeacherCourses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const paginationParams = getPaginationParams(req.query);
      const { teacherId } = req.params;

      // Allow teachers to view their own courses, admins to view any teacher's courses
      if (req.user.role !== 'super_admin' && req.user.id !== teacherId) {
        throw new ForbiddenError('Access denied');
      }

      const { courses, pagination } = await this.courseService.getTeacherCourses(
        teacherId,
        paginationParams
      );

      paginatedResponse(res, 'Teacher courses retrieved successfully', courses, pagination);
    } catch (error) {
      next(error);
    }
  };
}
