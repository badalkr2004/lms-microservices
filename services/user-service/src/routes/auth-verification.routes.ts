import { Router } from 'express';
import { AuthVerificationController } from '../controllers/auth-verification.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { serviceAuthMiddleware } from '../middleware/service-auth.middleware';
import {
  verifyTokenSchema,
  checkPermissionsSchema,
  getUserProfileSchema,
} from '../validation/auth-verification.validation';

const router: Router = Router();
const authVerificationController = new AuthVerificationController();

// Service-to-service authentication middleware for these endpoints
router.use(serviceAuthMiddleware);

// Token verification endpoint for other services
router.post(
  '/verify-token',
  validateRequest(verifyTokenSchema),
  authVerificationController.verifyToken.bind(authVerificationController)
);

// Permission check endpoint for authorization
router.post(
  '/check-permissions',
  validateRequest(checkPermissionsSchema),
  authVerificationController.checkPermissions.bind(authVerificationController)
);

// Get user profile for other services
router.get(
  '/user-profile/:userId',
  validateRequest(getUserProfileSchema),
  authVerificationController.getUserProfile.bind(authVerificationController)
);

export { router as authVerificationRoutes };
