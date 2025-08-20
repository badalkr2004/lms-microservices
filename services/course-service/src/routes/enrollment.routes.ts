// src/routes/enrollment.routes.ts
import { Router } from 'express';
import { EnrollmentController } from '../controllers/enrollment.controller';
import { EnrollmentService } from '../services/enrollment.service';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { CourseRepository } from '../repositories/course.repository';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation.middleware';
import { z } from 'zod';

const router: Router = Router();

// Validation schemas
const enrollSchema = z.object({
  courseId: z.string().uuid(),
});

const updateProgressSchema = z.object({
  progressPercentage: z.number().min(0).max(100),
  totalWatchTime: z.number().int().min(0).optional(),
});

// Initialize dependencies
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const enrollmentService = new EnrollmentService(enrollmentRepository, courseRepository);
const enrollmentController = new EnrollmentController(enrollmentService);

// Protected routes
router.post(
  '/',
  authenticate,
  authorize('student', 'create'),
  authorize('teacher', 'create'),
  authorize('super_admin', 'create'),
  validate(enrollSchema),
  enrollmentController.enrollInCourse
);

router.get('/me', authenticate, enrollmentController.getMyEnrollments);

router.get('/user/:userId', authenticate, enrollmentController.getUserEnrollments);

router.get(
  '/course/:courseId',
  authenticate,
  authorize('teacher', 'super_admin'),
  enrollmentController.getCourseEnrollments
);

router.get(
  '/course/:courseId/stats',
  authenticate,
  authorize('teacher', 'super_admin'),
  enrollmentController.getEnrollmentStats
);

router.patch(
  '/course/:courseId/progress',
  authenticate,
  authorize('student', 'update'),
  authorize('teacher', 'update'),
  authorize('super_admin', 'update'),
  validate(updateProgressSchema),
  enrollmentController.updateProgress
);

router.delete(
  '/course/:courseId',
  authenticate,
  authorize('student', 'delete'),
  authorize('teacher', 'delete'),
  authorize('super_admin', 'delete'),
  enrollmentController.dropEnrollment
);

router.get('/:id', authenticate, enrollmentController.getEnrollmentById);

export { router as enrollmentRoutes };
