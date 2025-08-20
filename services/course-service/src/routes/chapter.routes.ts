// src/routes/chapter.routes.ts
import { Router } from 'express';
import { ChapterController } from '../controllers/chapter.controller';
import { ChapterService } from '../services/chapter.service';
import { ChapterRepository } from '../repositories/chapter.repository';
import { CourseRepository } from '../repositories/course.repository';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation.middleware';
import {
  createChapterSchema,
  updateChapterSchema,
  reorderChaptersSchema,
} from '../validations/chapter.validation';

const router: Router = Router();

// Initialize dependencies
const courseRepository = new CourseRepository();
const chapterRepository = new ChapterRepository();
const chapterService = new ChapterService(chapterRepository, courseRepository);
const chapterController = new ChapterController(chapterService);

// Protected routes
router.post(
  '/',
  authenticate,
  authorize('teacher', 'super_admin'),
  validate(createChapterSchema),
  chapterController.createChapter
);

router.get('/course/:courseId', chapterController.getCourseChapters);

router.get('/:id', chapterController.getChapterById);

router.put(
  '/:id',
  authenticate,
  authorize('teacher', 'super_admin'),
  validate(updateChapterSchema),
  chapterController.updateChapter
);

router.delete(
  '/:id',
  authenticate,
  authorize('teacher', 'super_admin'),
  chapterController.deleteChapter
);

router.patch(
  '/course/:courseId/reorder',
  authenticate,
  authorize('teacher', 'super_admin'),
  validate(reorderChaptersSchema),
  chapterController.reorderChapters
);

export { router as chapterRoutes };
