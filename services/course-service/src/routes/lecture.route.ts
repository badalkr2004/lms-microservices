// src/routes/lecture.routes.ts
import { Router } from 'express';
import { LectureController } from '../controllers/lecture.controller';
import { LectureService } from '../services/lecture.service';
import { LectureRepository } from '../repositories/lecture.repository';
import { CourseRepository } from '../repositories/course.repository';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation.middleware';
import { createLectureSchema, updateLectureSchema } from '../validations/lecture.validation';

const router: Router = Router();

// Initialize dependencies
const courseRepository = new CourseRepository();
const lectureRepository = new LectureRepository();
const lectureService = new LectureService(lectureRepository, courseRepository);
const lectureController = new LectureController(lectureService);

// Public routes (with optional auth for enrollment checks)
router.get('/course/:courseId', lectureController.getCourseLectures);
router.get('/chapter/:chapterId', lectureController.getChapterLectures);
router.get('/:id', lectureController.getLectureById);

// Protected routes
router.post(
  '/',
  authenticate,
  authorize('teacher', 'super_admin'),
  validate(createLectureSchema),
  lectureController.createLecture
);

router.put(
  '/:id',
  authenticate,
  authorize('teacher', 'super_admin'),
  validate(updateLectureSchema),
  lectureController.updateLecture
);

router.delete(
  '/:id',
  authenticate,
  authorize('teacher', 'super_admin'),
  lectureController.deleteLecture
);

router.patch(
  '/course/:courseId/reorder',
  authenticate,
  authorize('teacher', 'super_admin'),
  lectureController.reorderLectures
);

export { router as lectureRoutes };
