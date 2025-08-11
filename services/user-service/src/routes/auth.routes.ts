import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  firebaseAuthSchema,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validation/auth.validation';

const router: Router = Router();
const authController = new AuthController();

// Firebase OAuth routes
router.post(
  '/firebase',
  validateRequest(firebaseAuthSchema),
  authController.firebaseAuth.bind(authController)
);

// Email/Password routes
router.post(
  '/register',
  validateRequest(registerSchema),
  authController.register.bind(authController)
);

router.post('/login', validateRequest(loginSchema), authController.login.bind(authController));

router.post(
  '/refresh-token',
  validateRequest(refreshTokenSchema),
  authController.refreshToken.bind(authController)
);

// Protected routes
router.get('/me', authMiddleware, authController.me.bind(authController));

export { router as authRoutes };
