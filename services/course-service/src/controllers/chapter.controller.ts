// src/controllers/chapter.controller.ts
import { Response, NextFunction } from 'express';
import { ChapterService } from '../services/chapter.service';
import { successResponse } from '../utils/response';
import { AuthenticatedRequest } from '@lms/shared-auth';
import { ForbiddenError } from '@/utils/errors';

export class ChapterController {
  constructor(private chapterService: ChapterService) {}

  createChapter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('User not found');
      }
      const chapter = await this.chapterService.createChapter(req.body, req.user.id, req.user.role);
      successResponse(res, 'Chapter created successfully', chapter, 201);
    } catch (error) {
      next(error);
    }
  };

  getCourseChapters = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      const chapters = await this.chapterService.getCourseChapters(courseId);
      successResponse(res, 'Chapters retrieved successfully', chapters);
    } catch (error) {
      next(error);
    }
  };

  getChapterById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const chapter = await this.chapterService.getChapterById(id);
      successResponse(res, 'Chapter retrieved successfully', chapter);
    } catch (error) {
      next(error);
    }
  };

  updateChapter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('User not found');
      }
      const { id } = req.params;
      const chapter = await this.chapterService.updateChapter(
        id,
        req.body,
        req.user.id,
        req.user.role
      );
      successResponse(res, 'Chapter updated successfully', chapter);
    } catch (error) {
      next(error);
    }
  };

  deleteChapter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('User not found');
      }
      const { id } = req.params;
      await this.chapterService.deleteChapter(id, req.user.id, req.user.role);
      successResponse(res, 'Chapter deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  reorderChapters = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('User not found');
      }
      const { courseId } = req.params;
      await this.chapterService.reorderChapters(
        courseId,
        req.body.chapters,
        req.user.id,
        req.user.role
      );
      successResponse(res, 'Chapters reordered successfully');
    } catch (error) {
      next(error);
    }
  };
}
