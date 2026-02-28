// src/controllers/enrollment.controller.ts
import { Response, NextFunction } from 'express';
import { EnrollmentService } from '../services/enrollment.service';
import { successResponse, paginatedResponse } from '../utils/response';
import { AuthenticatedRequest } from '@lms/shared-auth';
import { ForbiddenError } from '@/utils/errors';

export class EnrollmentController {
  constructor(private enrollmentService: EnrollmentService) {}

  enrollInCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { courseId } = req.body;
      const enrollment = await this.enrollmentService.enrollInCourse(req.user.id, courseId);
      successResponse(res, 'Successfully enrolled in course', enrollment, 201);
    } catch (error) {
      next(error);
    }
  };

  getEnrollmentById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const enrollment = await this.enrollmentService.getEnrollmentById(id);
      successResponse(res, 'Enrollment retrieved successfully', enrollment);
    } catch (error) {
      next(error);
    }
  };

  getUserEnrollments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { userId } = req.params;
      const { status } = req.query;

      // Allow users to view their own enrollments, admins to view any user's enrollments
      if (req.user.role !== 'super_admin' && req.user.id !== userId) {
        throw new ForbiddenError('Access denied');
      }

      const enrollments = await this.enrollmentService.getUserEnrollments(userId, status as string);
      successResponse(res, 'User enrollments retrieved successfully', enrollments);
    } catch (error) {
      next(error);
    }
  };

  getMyEnrollments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { status } = req.query;
      const enrollments = await this.enrollmentService.getUserEnrollments(
        req.user.id,
        status as string
      );
      successResponse(res, 'Your enrollments retrieved successfully', enrollments);
    } catch (error) {
      next(error);
    }
  };

  getCourseEnrollments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { courseId } = req.params;
      const enrollments = await this.enrollmentService.getCourseEnrollments(
        courseId,
        req.user.id,
        req.user.role
      );
      successResponse(res, 'Course enrollments retrieved successfully', enrollments);
    } catch (error) {
      next(error);
    }
  };

  updateProgress = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { courseId } = req.params;
      const { progressPercentage, totalWatchTime } = req.body;

      const result = await this.enrollmentService.updateProgress(
        req.user.id,
        courseId,
        progressPercentage,
        totalWatchTime
      );
      successResponse(res, 'Progress updated successfully', result);
    } catch (error) {
      next(error);
    }
  };

  dropEnrollment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { courseId } = req.params;
      const result = await this.enrollmentService.dropEnrollment(req.user.id, courseId);
      successResponse(res, 'Successfully dropped from course', result);
    } catch (error) {
      next(error);
    }
  };

  getEnrollmentStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { courseId } = req.params;
      const stats = await this.enrollmentService.getEnrollmentStats(
        courseId,
        req.user.id,
        req.user.role
      );
      successResponse(res, 'Enrollment stats retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Complete enrollment after successful payment (internal service endpoint)
   * Called by Payment Service via service-to-service authentication
   */
  completeEnrollment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, courseId, paymentId } = req.body;
      
      // Create enrollment for paid course
      const enrollment = await this.enrollmentService.enrollInCourse(userId, courseId);
      
      successResponse(res, 'Enrollment completed successfully', {
        enrollment,
        paymentId,
      }, 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Drop enrollment on refund (internal service endpoint)
   * Called by Payment Service via service-to-service authentication
   */
  dropEnrollmentInternal = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, courseId } = req.body;
      
      const result = await this.enrollmentService.dropEnrollment(userId, courseId);
      
      successResponse(res, 'Enrollment dropped successfully', result);
    } catch (error) {
      next(error);
    }
  };
}
