# LMS Authentication & Authorization System

## Overview

This document describes the comprehensive authentication and authorization system implemented for the LMS microservices architecture. The system provides secure inter-service communication with robust RBAC (Role-Based Access Control).

## Architecture

### Components

1. **User Service** - Central authentication authority
2. **Shared Auth Library** - Reusable authentication utilities
3. **Service-to-Service Authentication** - Secure inter-service communication
4. **API Gateway** - Request routing and initial security

### Authentication Flow

```
Client Request → API Gateway → Service → User Service (Auth Verification) → Response
```

## User Service Authentication Endpoints

### `/api/auth-verification/verify-token` (POST)
Verifies user tokens for other services.

**Request:**
```json
{
  "token": "jwt_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "role": "student|instructor|admin",
      "status": "active",
      "emailVerified": true
    },
    "tokenPayload": {
      "userId": "user-id",
      "email": "user@example.com",
      "role": "student"
    }
  }
}
```

### `/api/auth-verification/check-permissions` (POST)
Checks user permissions for specific resources.

**Request:**
```json
{
  "userId": "user-id",
  "resource": "courses",
  "action": "create",
  "context": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-id",
    "resource": "courses",
    "action": "create",
    "hasPermission": true,
    "userRole": "instructor"
  }
}
```

## RBAC Permissions Matrix

| Role | Courses | Assessments | Students | Analytics | Live Sessions | Files | Payments |
|------|---------|-------------|----------|-----------|---------------|-------|----------|
| **Admin** | All | All | All | All | All | All | All |
| **Instructor** | CRUD | CRUD | Read | Read | CRUD | CRUD | - |
| **Student** | Read | Read/Submit | - | - | Read/Join | Read | Create/Read |
| **Guest** | Read | - | - | - | - | - | - |

## Service Integration

### 1. Install Shared Auth Library

```bash
# In your service directory
npm install @lms/shared-auth
```

### 2. Initialize Auth Client

```typescript
import { createAuthClient } from '@lms/shared-auth';

const authClient = createAuthClient('course-service');
```

### 3. Use Authentication Middleware

```typescript
import { createAuthMiddleware, createAuthorizationMiddleware } from '@lms/shared-auth';

const authenticate = createAuthMiddleware(authClient);
const authorize = (resource: string, action: string) => 
  createAuthorizationMiddleware(authClient, resource, action);

// Use in routes
router.get('/courses', authenticate, authorize('courses', 'read'), handler);
```

### 4. Pre-configured Route Protection

```typescript
import { createProtectedRoute } from '@lms/shared-auth';

const protectCourseCreate = createProtectedRoute(authClient, 'courses', 'create');

router.post('/courses', ...protectCourseCreate, handler);
```

## Service-to-Service Authentication

Services authenticate with the user service using:

1. **API Keys** - Unique per service
2. **HMAC Signatures** - Request integrity verification
3. **Timestamps** - Replay attack prevention

### Required Headers

```
x-service-api-key: service_api_key
x-service-id: service_name
x-timestamp: unix_timestamp
x-signature: hmac_sha256_signature
```

### Signature Generation

```typescript
const payload = `${serviceId}:${timestamp}:${JSON.stringify(requestBody)}`;
const signature = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
```

## Environment Configuration

### Required Environment Variables

```bash
# Service API Keys
COURSE_SERVICE_API_KEY=your_course_service_key
PAYMENT_SERVICE_API_KEY=your_payment_service_key
# ... other service keys

# Shared Secret
SERVICE_SECRET_KEY=your_shared_secret_key

# User Service URL
USER_SERVICE_URL=http://localhost:3001
```

## Security Features

### 1. Token Verification
- JWT signature validation
- Token expiration checking
- User status verification

### 2. Permission Checking
- Role-based access control
- Resource-specific permissions
- Context-aware authorization

### 3. Inter-Service Security
- API key authentication
- HMAC signature verification
- Timestamp validation (prevents replay attacks)
- Request integrity checking

### 4. Error Handling
- Secure error messages
- Comprehensive logging
- Graceful degradation

## Usage Examples

### Basic Authentication

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/protected', authenticate, (req, res) => {
  // req.user contains authenticated user data
  res.json({ user: req.user });
});
```

### Role-Based Authorization

```typescript
router.post('/admin-only', 
  authenticate, 
  authorize('admin', 'manage'), 
  (req, res) => {
    // Only admins can access this endpoint
    res.json({ message: 'Admin access granted' });
  }
);
```

### Custom Permission Logic

```typescript
router.put('/courses/:courseId', authenticate, async (req, res) => {
  const permissionResult = await authClient.checkPermissions(
    req.user.id,
    'courses',
    'update',
    { courseId: req.params.courseId }
  );

  if (!permissionResult.hasPermission) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }

  // Process course update
});
```

## Best Practices

### 1. Security
- Always validate tokens on protected routes
- Use HTTPS in production
- Rotate API keys regularly
- Monitor authentication failures

### 2. Performance
- Cache user data when appropriate
- Use connection pooling for auth requests
- Implement request timeouts

### 3. Error Handling
- Log authentication failures
- Provide meaningful error messages
- Implement retry logic for service communication

### 4. Monitoring
- Track authentication success/failure rates
- Monitor service-to-service communication
- Set up alerts for security events

## Troubleshooting

### Common Issues

1. **Token Verification Fails**
   - Check token expiration
   - Verify JWT secret configuration
   - Ensure user account is active

2. **Permission Denied**
   - Verify user role
   - Check resource permissions
   - Validate action requirements

3. **Service Authentication Fails**
   - Verify API keys
   - Check HMAC signature generation
   - Validate timestamp (max 5 minutes old)

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
DEBUG=auth:*
```

## Migration Guide

### From Basic Auth to RBAC

1. Update service dependencies
2. Replace existing auth middleware
3. Configure environment variables
4. Test permission matrix
5. Deploy incrementally

This authentication system provides enterprise-grade security while maintaining simplicity and modularity for your LMS microservices architecture.
