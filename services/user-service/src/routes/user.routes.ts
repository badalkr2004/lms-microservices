// routes/user.route.ts
import { Router, RequestHandler } from 'express';
import { UserController, handleUserErrors } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
// import { rateLimitMiddleware } from '../middleware/user_middleware/rateLimit.middleware';
import { auth } from 'firebase-admin';

const router: Router = Router();
const userController = new UserController();

/**
 * Apply authentication middleware to all routes
 */
router.use(authMiddleware);

/**
 * Rate limiting for follow/unfollow operations to prevent abuse
 */
// const followRateLimit = rateLimitMiddleware({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 50, // 50 follow/unfollow operations per 15 minutes per user
//   message: 'Too many follow/unfollow requests. Please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

/**
 * Profile route
 */
// GET /api/users/profile - Get student profile (name, email, avatar, following count)
router.get('/profile', authMiddleware, userController.getProfile.bind(userController));

/**
 * Follow/Unfollow routes with rate limiting
 */
// POST /api/users/follow - Follow a teacher
// router.post('/follow', followRateLimit, userController.followTeacher.bind(userController));

// DELETE /api/users/unfollow - Unfollow a teacher
// router.delete('/unfollow', followRateLimit, userController.unfollowTeacher.bind(userController));

/**
 * Error handling middleware (must be last)
 */
router.use(handleUserErrors);

export default router;
