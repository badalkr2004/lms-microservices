// src/routes/progress.routes.ts
import { Router } from 'express';
import { ProgressController } from '../controllers/progress.controller';
import { ProgressService } from '../services/progress.service';
import { ProgressRepository } from '../repositories/progress.repository';
import { LectureRepository } from '../repositories/lecture.repository';
import { EnrollmentService } from '../services/enrollment.service';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { CourseRepository } from '../repositories/course.repository';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation.middleware';
import { z } from 'zod';

const router: Router = Router();

// Validation schemas
const updateProgressSchema = z.object({
  watchTime: z.number().int().min(0).optional(),
  lastPosition: z.number().int().min(0).optional(),
  isCompleted: z.boolean().optional(),
});

// Initialize dependencies
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const lectureRepository = new LectureRepository();
const progressRepository = new ProgressRepository();
const enrollmentService = new EnrollmentService(enrollmentRepository, courseRepository);
const progressService = new ProgressService(
  progressRepository,
  lectureRepository,
  enrollmentService
);
const progressController = new ProgressController(progressService);

// All routes require authentication
router.use(authenticate);

router.patch(
  '/lecture/:lectureId',
  validate(updateProgressSchema),
  progressController.updateLectureProgress
);

router.get('/lecture/:lectureId', progressController.getLectureProgress);

router.get('/course/:courseId', progressController.getCourseProgress);

router.patch('/lecture/:lectureId/complete', progressController.markLectureComplete);

router.patch('/lecture/:lectureId/incomplete', progressController.markLectureIncomplete);

router.delete('/lecture/:lectureId/reset', progressController.resetLectureProgress);

router.delete('/course/:courseId/reset', progressController.resetCourseProgress);

export { router as progressRoutes };
