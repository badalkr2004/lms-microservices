export { AuthClient, createAuthClient } from './auth-client';
export { 
  createAuthMiddleware, 
  createAuthorizationMiddleware, 
  createProtectedRoute,
  AuthenticatedRequest 
} from './middleware/auth.middleware';
export type {
  UserData,
  TokenVerificationResult,
  PermissionCheckResult,
  UserProfile
} from './auth-client';
