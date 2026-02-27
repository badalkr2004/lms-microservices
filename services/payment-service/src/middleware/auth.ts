import {
  createAuthClient,
  createAuthMiddleware,
  createAuthorizationMiddleware,
  createProtectedRoute,
} from '@lms/shared-auth';

// Initialize auth client for course service
export const authClient = createAuthClient('payment-service');

// Create middleware instances
export const authenticate = createAuthMiddleware(authClient);
export const authorize = (resource: string, action: string) =>
  createAuthorizationMiddleware(authClient, resource, action);

// Pre-configured route protections for common course operations
export const protectPaymentRead = createProtectedRoute(authClient, 'payments', 'read');
export const protectPaymentCreate = createProtectedRoute(authClient, 'payments', 'create');
