// src/routes/review.routes.ts
import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { ReviewService } from '../services/review.service';
import { ReviewRepository } from '../repositories/review.repository';
import { CourseRepository } from '../repositories/course.repository';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation.middleware';
import { z } from 'zod';

const router: Router = Router();

// Validation schemas
const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().min(1).max(1000).optional(),
});

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  reviewText: z.string().min(1).max(1000).optional(),
});

// Initialize dependencies
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const reviewRepository = new ReviewRepository();
const reviewService = new ReviewService(reviewRepository, courseRepository, enrollmentRepository);
const reviewController = new ReviewController(reviewService);

// Course Reviews
router.get('/course/:courseId', reviewController.getCourseReviews);
router.get('/course/:courseId/stats', reviewController.getCourseRatingStats);

router.post(
  '/course/:courseId',
  authenticate,
  authorize('student', 'create'),
  authorize('teacher', 'create'),
  authorize('super_admin', 'create'),
  validate(createReviewSchema),
  reviewController.createCourseReview
);

router.get('/course/review/:id', reviewController.getCourseReviewById);

router.put(
  '/course/review/:id',
  authenticate,
  validate(updateReviewSchema),
  reviewController.updateCourseReview
);

router.delete('/course/review/:id', authenticate, reviewController.deleteCourseReview);

// Teacher Reviews
router.get('/teacher/:teacherId', reviewController.getTeacherReviews);
router.get('/teacher/:teacherId/stats', reviewController.getTeacherRatingStats);

router.post(
  '/teacher/:teacherId',
  authenticate,
  authorize('student', 'create'),
  validate(createReviewSchema),
  reviewController.createTeacherReview
);

export { router as reviewRoutes };
