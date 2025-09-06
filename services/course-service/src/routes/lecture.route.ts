// src/routes/lecture.routes.ts
import { Router } from 'express';
import { LectureController } from '../controllers/lecture.controller';
import { LectureService } from '../services/lecture.service';
import { LectureRepository } from '../repositories/lecture.repository';
import { CourseRepository } from '../repositories/course.repository';
import {
  authenticate,
  authorize,
  protectCourseCreate,
  protectCourseDelete,
  protectCourseUpdate,
} from '../middleware/auth';
import { validate } from '../middleware/validation.middleware';
import { createLectureSchema, updateLectureSchema } from '../validations/lecture.validation';
import { fileClient } from '@/client/file.client';

const router: Router = Router();

// Initialize dependencies
const courseRepository = new CourseRepository();
const lectureRepository = new LectureRepository();
const lectureService = new LectureService(lectureRepository, courseRepository, fileClient);
const lectureController = new LectureController(lectureService);

// Public routes (with optional auth for enrollment checks)
router.get('/course/:courseId', lectureController.getCourseLectures);
router.get('/chapter/:chapterId', lectureController.getChapterLectures);
router.get('/:id', lectureController.getLectureById);

// Protected routes
router.get('/:lectureId/playback-url', authenticate, lectureController.getLecturePlaybackUrl);

router.post(
  '/',
  authenticate,
  ...protectCourseCreate,
  validate(createLectureSchema),
  lectureController.createLecture
);

router.post(
  '/with-video',
  authenticate,
  ...protectCourseCreate,
  validate(createLectureSchema),
  lectureController.createLectureWithVideo
);

router.get(
  '/:courseId/video-status',
  authenticate,
  lectureController.getCourseLecturesWithVideoStatus
);

router.put(
  '/:id',
  authenticate,
  ...protectCourseUpdate,
  validate(updateLectureSchema),
  lectureController.updateLecture
);

router.delete('/:id', authenticate, ...protectCourseDelete, lectureController.deleteLecture);
router.put(
  '/:lectureId/attach-video',
  authenticate,
  ...protectCourseUpdate,
  lectureController.attachVideoToLecture
);

router.patch(
  '/course/:courseId/reorder',
  authenticate,
  ...protectCourseUpdate,
  lectureController.reorderLectures
);

export { router as lectureRoutes };
