// src/routes/chapter.routes.ts
import { Router } from 'express';
import { ChapterController } from '../controllers/chapter.controller';
import { ChapterService } from '../services/chapter.service';
import { ChapterRepository } from '../repositories/chapter.repository';
import { CourseRepository } from '../repositories/course.repository';
import {
  authenticate,
  authorize,
  protectCourseCreate,
  protectCourseDelete,
  protectCourseUpdate,
} from '../middleware/auth';
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
  ...protectCourseCreate,
  validate(createChapterSchema),
  chapterController.createChapter
);

router.get('/course/:courseId', chapterController.getCourseChapters);

router.get('/:id', chapterController.getChapterById);

router.put(
  '/:id',
  ...protectCourseUpdate,
  validate(updateChapterSchema),
  chapterController.updateChapter
);

router.delete('/:id', ...protectCourseDelete, chapterController.deleteChapter);

router.patch(
  '/course/:courseId/reorder',
  ...protectCourseUpdate,
  validate(reorderChaptersSchema),
  chapterController.reorderChapters
);

export { router as chapterRoutes };
