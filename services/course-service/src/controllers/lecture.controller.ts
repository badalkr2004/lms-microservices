// src/controllers/lecture.controller.ts
import { Response, NextFunction } from 'express';
import { LectureService } from '../services/lecture.service';
import { successResponse } from '../utils/response';
import { AuthenticatedRequest } from '@lms/shared-auth';
import { ForbiddenError } from '@/utils/errors';

export class LectureController {
  constructor(private lectureService: LectureService) {}

  createLecture = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const lecture = await this.lectureService.createLecture(req.body, req.user.id, req.user.role);
      successResponse(res, 'Lecture created successfully', lecture, 201);
    } catch (error) {
      next(error);
    }
  };

  getLectureById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const lecture = await this.lectureService.getLectureById(id);
      successResponse(res, 'Lecture retrieved successfully', lecture);
    } catch (error) {
      next(error);
    }
  };

  getCourseLectures = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      const lectures = await this.lectureService.getCourseLectures(courseId);
      successResponse(res, 'Course lectures retrieved successfully', lectures);
    } catch (error) {
      next(error);
    }
  };

  getChapterLectures = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { chapterId } = req.params;
      const lectures = await this.lectureService.getChapterLectures(chapterId);
      successResponse(res, 'Chapter lectures retrieved successfully', lectures);
    } catch (error) {
      next(error);
    }
  };

  updateLecture = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { id } = req.params;
      const lecture = await this.lectureService.updateLecture(
        id,
        req.body,
        req.user.id,
        req.user.role
      );
      successResponse(res, 'Lecture updated successfully', lecture);
    } catch (error) {
      next(error);
    }
  };

  deleteLecture = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { id } = req.params;
      await this.lectureService.deleteLecture(id, req.user.id, req.user.role);
      successResponse(res, 'Lecture deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  reorderLectures = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const { courseId } = req.params;
      const { lectures, chapterId } = req.body;

      await this.lectureService.reorderLectures(
        courseId,
        lectures,
        req.user.id,
        req.user.role,
        chapterId
      );

      successResponse(res, 'Lectures reordered successfully');
    } catch (error) {
      next(error);
    }
  };
}
