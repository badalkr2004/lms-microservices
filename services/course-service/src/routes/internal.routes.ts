import { CourseController } from '@/controllers/course.controller';
import { EnrollmentController } from '@/controllers/enrollment.controller';
import { serviceAuthMiddleware } from '@/middleware/service-auth.middleware';
import { CourseRepository } from '@/repositories/course.repository';
import { EnrollmentRepository } from '@/repositories/enrollment.repository';
import { CourseService } from '@/services/course.service';
import { EnrollmentService } from '@/services/enrollment.service';
import { PaymentServiceClient } from '@/client/payment.client';
import { Router } from 'express';

export const internalRoutes: Router = Router();

internalRoutes.use(serviceAuthMiddleware);

// Initialize dependencies
const courseRepository = new CourseRepository();
const courseService = new CourseService(courseRepository);
const courseController = new CourseController(courseService);

const enrollmentRepository = new EnrollmentRepository();
const paymentServiceClient = new PaymentServiceClient();
const enrollmentService = new EnrollmentService(enrollmentRepository, courseRepository, paymentServiceClient);
const enrollmentController = new EnrollmentController(enrollmentService);

// Course internal endpoints
internalRoutes.get('/course/:id', courseController.getCourseById);

// Enrollment internal endpoints (called by Payment Service)
internalRoutes.post('/enrollments/complete', enrollmentController.completeEnrollment);
internalRoutes.post('/enrollments/drop', enrollmentController.dropEnrollmentInternal);
