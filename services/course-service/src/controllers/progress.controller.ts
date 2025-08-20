// src/controllers/progress.controller.ts
import { Response, NextFunction } from 'express';
import { ProgressService } from '../services/progress.service';
import { successResponse } from '../utils/response';
import { AuthenticatedRequest } from '@lms/shared-auth';
import { ForbiddenError } from '@/utils/errors';

export class ProgressController {
  constructor(private progressService: ProgressService) {}

  updateLectureProgress = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { lectureId } = req.params;
      const progress = await this.progressService.updateLectureProgress(
        req.user.id,
        lectureId,
        req.body
      );
      successResponse(res, 'Lecture progress updated successfully', progress);
    } catch (error) {
      next(error);
    }
  };

  getLectureProgress = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { lectureId } = req.params;
      const progress = await this.progressService.getLectureProgress(req.user.id, lectureId);
      successResponse(res, 'Lecture progress retrieved successfully', progress);
    } catch (error) {
      next(error);
    }
  };

  getCourseProgress = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { courseId } = req.params;
      const progress = await this.progressService.getCourseProgress(req.user.id, courseId);
      successResponse(res, 'Course progress retrieved successfully', progress);
    } catch (error) {
      next(error);
    }
  };

  markLectureComplete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { lectureId } = req.params;
      const progress = await this.progressService.markLectureComplete(req.user.id, lectureId);
      successResponse(res, 'Lecture marked as complete', progress);
    } catch (error) {
      next(error);
    }
  };

  markLectureIncomplete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { lectureId } = req.params;
      const progress = await this.progressService.markLectureIncomplete(req.user.id, lectureId);
      successResponse(res, 'Lecture marked as incomplete', progress);
    } catch (error) {
      next(error);
    }
  };

  resetLectureProgress = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { lectureId } = req.params;
      const result = await this.progressService.resetLectureProgress(req.user.id, lectureId);
      successResponse(res, 'Lecture progress reset successfully', result);
    } catch (error) {
      next(error);
    }
  };

  resetCourseProgress = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { courseId } = req.params;
      const result = await this.progressService.resetCourseProgress(req.user.id, courseId);
      successResponse(res, 'Course progress reset successfully', result);
    } catch (error) {
      next(error);
    }
  };
}
