import { CourseController } from '@/controllers/course.controller';
import { serviceAuthMiddleware } from '@/middleware/service-auth.middleware';
import { CourseRepository } from '@/repositories/course.repository';
import { CourseService } from '@/services/course.service';
import { Router } from 'express';

export const internalRoutes: Router = Router();

internalRoutes.use(serviceAuthMiddleware);

// Initialize dependencies
const courseRepository = new CourseRepository();
const courseService = new CourseService(courseRepository);
const courseController = new CourseController(courseService);

internalRoutes.get('/course/:id', courseController.getCourseById);
