// src/controllers/lecture.controller.ts
import { Response, NextFunction } from 'express';
import { LectureService } from '../services/lecture.service';
import { successResponse } from '../utils/response';
import { AuthenticatedRequest } from '@lms/shared-auth';
import { AppError, ForbiddenError } from '@/utils/errors';
import { logger } from '@lms/logger';
import { ZodError } from 'zod';
import { validateAttachVideo, validatePlaybackUrl } from '@/validations/lecture.validation';
import { sendSuccess } from '@lms/common';

const formatZodError = (error: ZodError) => {
  return error.format();
};

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
  createLectureWithVideo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log('1. Lecture with video in controller called::');
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const lectureWithVideo = await this.lectureService.createLectureWithVideo(
        req.user.role,
        req.body,
        req.user.id
      );
      console.log('6.Lecture with video in cotroller::', lectureWithVideo);
      successResponse(res, 'Lecture created successfully', lectureWithVideo, 201);
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

  getCourseLecturesWithVideoStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?.id) {
        throw new ForbiddenError('Authentication required');
      }
      const { courseId } = req.params;
      const lectures = await this.lectureService.getCourseLecturesWithVideoStatus(
        courseId,
        req.user.id
      );
      successResponse(res, 'Course lectures retrieved successfully', lectures);
    } catch (error) {
      next(error);
    }
  };

  getLecturePlaybackUrl = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new ForbiddenError('Authentication required');
      }
      const parsed = validatePlaybackUrl(req.body);
      if (!parsed.success) {
        const err = formatZodError(parsed.error)[0];
        throw new AppError(err.message, 400);
      }

      const { lectureId } = req.params;
      const userId = req.user.id;

      if (!userId) throw new AppError('User ID required', 401);

      const playbackData = await this.lectureService.getLectureVideoPlaybackUrl(lectureId, userId);

      sendSuccess(res, playbackData, 'Playback URL retrieved successfully', 200);
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

  attachVideoToLecture = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }
      const parsed = validateAttachVideo(req.body);
      if (!parsed.success) {
        throw new Error('Invalid video file');
      }

      const { lectureId } = req.params;
      const userId = req.user.id;

      if (!userId) throw new AppError('User ID required', 401);

      const videoUpload = await this.lectureService.attachVideoToLecture(
        lectureId,
        parsed.data,
        userId,
        req.user.role
      );

      logger.info('Video attached to lecture', {
        lectureId,
        fileId: videoUpload.fileId,
        userId,
      });

      res.status(200).json({
        success: true,
        message: 'Video upload initiated for lecture',
        data: videoUpload,
      });
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
