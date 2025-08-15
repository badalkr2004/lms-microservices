import { createAuthClient, createAuthMiddleware, createAuthorizationMiddleware, createProtectedRoute } from '@lms/shared-auth';

// Initialize auth client for course service
export const authClient = createAuthClient('course-service');

// Create middleware instances
export const authenticate = createAuthMiddleware(authClient);
export const authorize = (resource: string, action: string) => 
  createAuthorizationMiddleware(authClient, resource, action);

// Pre-configured route protections for common course operations
export const protectCourseRead = createProtectedRoute(authClient, 'courses', 'read');
export const protectCourseCreate = createProtectedRoute(authClient, 'courses', 'create');
export const protectCourseUpdate = createProtectedRoute(authClient, 'courses', 'update');
export const protectCourseDelete = createProtectedRoute(authClient, 'courses', 'delete');
