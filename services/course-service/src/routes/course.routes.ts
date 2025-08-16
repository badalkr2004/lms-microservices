import { Router } from 'express';
import {
  authenticate,
  authorize,
  protectCourseRead,
  protectCourseCreate,
  protectCourseUpdate,
  protectCourseDelete,
} from '../middleware/auth';
import { AuthenticatedRequest } from '@lms/shared-auth';
import { Response } from 'express';

const router: Router = Router();

// Public routes (no authentication required)
router.get('/public', (req, res) => {
  res.json({
    success: true,
    message: 'Public courses endpoint',
    data: [],
  });
});

// Protected routes with different permission levels

// Read courses - accessible by students, instructors, and admins
router.get('/', ...protectCourseRead, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    message: 'Courses retrieved successfully',
    user: req.user,
    data: [],
  });
});

// Get specific course - requires read permission
router.get(
  '/:courseId',
  authenticate,
  authorize('courses', 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      message: `Course ${req.params.courseId} retrieved successfully`,
      user: req.user,
      data: { id: req.params.courseId },
    });
  }
);

// Create course - only instructors and admins
router.post('/', ...protectCourseCreate, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    message: 'Course created successfully',
    user: req.user,
    data: { id: 'new-course-id', ...req.body },
  });
});

// Update course - only instructors and admins
router.put('/:courseId', ...protectCourseUpdate, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    message: `Course ${req.params.courseId} updated successfully`,
    user: req.user,
    data: { id: req.params.courseId, ...req.body },
  });
});

// Delete course - only instructors and admins
router.delete('/:courseId', ...protectCourseDelete, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    message: `Course ${req.params.courseId} deleted successfully`,
    user: req.user,
  });
});

// Custom authorization example - only course owner or admin can manage enrollments
router.post(
  '/:courseId/enrollments',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    // Custom logic to check if user owns the course or is admin
    if (req.user?.role === 'admin' || req.user?.role === 'instructor') {
      res.json({
        success: true,
        message: 'Enrollment created successfully',
        user: req.user,
      });
    } else {
      res.status(403).json({
        success: false,
        message: 'Only course instructors and admins can manage enrollments',
      });
    }
  }
);

export { router as courseRoutes };
