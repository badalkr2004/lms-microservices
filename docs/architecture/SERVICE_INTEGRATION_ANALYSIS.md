# Service Integration Analysis & End-to-End Flow

## Current Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT REQUESTS                                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY (Port 3000)                                     │
│                         (Routing, Rate Limiting, Auth)                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
       ┌───────────────────────────────────┼───────────────────────────────────┐
       │                                   │                                   │
       ▼                                   ▼                                   ▼
┌──────────────┐                ┌──────────────┐                ┌──────────────┐
│User Service  │                │Course Service│                │Payment Service│
│(Port 3001)   │◄──────────────►│(Port 3002)   │◄──────────────►│(Port 3003)   │
│              │   Auth Verify  │              │  Enroll/Payment│              │
└──────────────┘                └──────┬───────┘                └──────┬───────┘
                                       │                               │
                                       │                               │
                                       ▼                               ▼
                              ┌──────────────┐                ┌──────────────┐
                              │ File Service │                │   External   │
                              │(Port 3008)   │                │   Gateways   │
                              │              │                │ (Stripe/Raz) │
                              └──────────────┘                └──────────────┘
```

## Service Communication Patterns

### 1. Authentication Flow (User Service as Authority)

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Client    │─────▶│ API Gateway │─────▶│User Service │
│             │      │             │      │  (Verify)   │
└─────────────┘      └─────────────┘      └──────┬──────┘
                                                  │
                                                  │ JWT Token
                                                  ▼
                                         ┌─────────────┐
                                         │  Response   │
                                         │  (Token)    │
                                         └─────────────┘
```

**Implementation:**
- User Service has `auth-verification.controller.ts` for inter-service auth
- Other services use `@lms/shared-auth` to verify tokens with User Service
- JWT tokens are issued by User Service and validated by other services

### 2. Course-Payment Integration

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Course Service │         │ Payment Service │         │  Course Service │
│                 │         │                 │         │                 │
│ 1. Get Course   │◄────────│                 │         │ 5. Complete     │◄──┐
│    Details      │         │                 │         │    Enrollment   │   │
│                 │         │                 │         │                 │   │
│                 │         │ 2. Create       │         │                 │   │
│                 │         │    Payment      │         │                 │   │
│                 │         │                 │         │                 │   │
│                 │         │ 3. Verify       │         │                 │   │
│                 │         │    Payment      │         │                 │   │
│                 │         │                 │         │                 │   │
│                 │         │ 4. Call         │────────►│                 │   │
│                 │         │    complete     │         │                 │   │
│                 │         │    enrollment   │         │                 │   │
└─────────────────┘         └─────────────────┘         └─────────────────┘   │
                                                                              │
┌─────────────────────────────────────────────────────────────────────────────┘
│ Internal Endpoint: POST /api/enrollments/internal/complete
│ Auth: HMAC Service-to-Service
└─────────────────────────────────────────────────────────────────────────────┘
```

**Current Implementation:**
- `payment-service/src/client/course.client.ts` calls Course Service
- Uses HMAC signature for service authentication
- Endpoint: `POST /api/enrollments/internal/complete`

**Missing:** Enrollment completion endpoint in Course Service

### 3. Course-File Integration

```
┌─────────────────┐         ┌─────────────────┐
│  Course Service │         │  File Service   │
│                 │         │                 │
│ 1. Initiate     │────────►│ 2. Generate     │
│    Upload       │         │    Presigned URL│
│                 │         │                 │
│ 4. Get Status   │◄────────│ 3. Process      │
│                 │         │    Video (Mux)  │
│                 │         │                 │
│ 5. Get Playback │◄────────│ 6. Return       │
│    URL          │         │    Signed URL   │
└─────────────────┘         └─────────────────┘
```

**Current Implementation:**
- `course-service/src/client/file.client.ts` handles all file operations
- File Service uses Mux for video processing
- Supports presigned URLs for direct S3 upload

### 4. Enrollment Flow (End-to-End)

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  User   │──▶│ Gateway │──▶│  Auth   │──▶│ Course  │──▶│ Payment │──▶│ Course  │
│         │   │         │   │ Check   │   │ Service │   │ Service │   │ Service │
│         │   │         │   │         │   │         │   │         │   │         │
│ 1. Req  │   │ 2. Route│   │ 3. Verify│  │ 4. Check│   │ 5. Create│  │ 7. Create│
│ Enroll  │   │         │   │ Token   │   │ Course  │   │ Payment │   │ Enrollment│
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
                                                                            │
                                                                            ▼
                                                                     ┌─────────┐
                                                                     │  User   │
                                                                     │ Enrolled│
                                                                     └─────────┘
```

## Current Wiring Status

### ✅ Implemented Connections

| From | To | Method | Purpose | Status |
|------|-----|--------|---------|--------|
| Course Service | File Service | HTTP Client | Video upload/playback | ✅ Working |
| Course Service | Payment Service | HTTP Client | Create payment | ✅ Working |
| Payment Service | Course Service | HTTP Client | Get course details | ✅ Working |
| Payment Service | Course Service | HTTP Client | Complete enrollment | ⚠️ Partial |
| All Services | User Service | @lms/shared-auth | Token verification | ✅ Working |

### ❌ Missing Connections

| From | To | Purpose | Priority |
|------|-----|---------|----------|
| Payment Service | Course Service | Complete enrollment endpoint | High |
| Payment Service | Course Service | Drop enrollment on refund | Medium |
| Course Service | User Service | Verify teacher exists | Medium |
| File Service | Course Service | Webhook for video processing | Medium |

## End-to-End Flows to Implement

### Flow 1: Complete Course Purchase & Enrollment

```typescript
// Step 1: User browses courses (Public)
GET /api/course/courses

// Step 2: User views course details (Public)
GET /api/course/courses/:id

// Step 3: User initiates enrollment (Authenticated)
POST /api/course/enrollments
Headers: Authorization: Bearer <jwt>
Body: { courseId: "uuid" }

// Step 4: System checks if course is paid
// If FREE: Create enrollment directly
// If PAID: Return payment requirement

// Step 5: Create payment (Authenticated)
POST /api/payment/payments
Headers: Authorization: Bearer <jwt>
Body: {
  courseId: "uuid",
  amount: 99.99,
  currency: "USD",
  paymentMethod: "stripe"
}

// Step 6: Client completes payment with Stripe/Razorpay
// ... Payment gateway interaction ...

// Step 7: Verify payment (Authenticated)
POST /api/payment/payments/:id/verify
Body: {
  paymentGatewayId: "pi_xxx",
  signature: "..."
}

// Step 8: Payment Service calls Course Service internally
POST /api/enrollments/internal/complete
Headers: Service-to-Service Auth
Body: {
  userId: "uuid",
  courseId: "uuid",
  paymentId: "uuid"
}

// Step 9: Enrollment created, return success
Response: { success: true, enrollmentId: "uuid" }
```

### Flow 2: Video Upload & Processing

```typescript
// Step 1: Teacher initiates upload (Authenticated)
POST /api/course/lectures/:id/upload
Headers: Authorization: Bearer <jwt>
Body: {
  fileName: "lesson1.mp4",
  fileSize: 104857600,
  contentType: "video/mp4"
}

// Step 2: Course Service calls File Service
POST /api/files/internal/presigned-url
Headers: Service-to-Service Auth

// Step 3: Return presigned URL to client
Response: {
  fileId: "uuid",
  uploadUrl: "https://s3-presigned-url...",
  expiresAt: "2024-01-01T00:00:00Z"
}

// Step 4: Client uploads directly to S3
PUT https://s3-presigned-url...
Body: <video file>

// Step 5: Client confirms upload
POST /api/course/lectures/:id/confirm-upload
Body: { fileId: "uuid" }

// Step 6: File Service processes video with Mux
// Webhook from Mux updates status

// Step 7: Teacher checks processing status
GET /api/course/lectures/:id/status

// Step 8: Video ready, return playback URL
GET /api/course/lectures/:id
Response: {
  videoUrl: "https://stream.mux.com/...",
  thumbnailUrl: "https://image.mux.com/..."
}
```

### Flow 3: User Progress Tracking

```typescript
// Step 1: User watches lecture video
// Video player tracks watch time

// Step 2: Update progress periodically
PATCH /api/course/enrollments/course/:courseId/progress
Headers: Authorization: Bearer <jwt>
Body: {
  progressPercentage: 75.5,
  totalWatchTime: 3600
}

// Step 3: System updates enrollment record
// If progress >= 100%, mark as completed

// Step 4: Generate certificate (if applicable)
POST /api/course/enrollments/:id/certificate

// Step 5: Notify user
// Notification Service sends email
```

## Implementation Tasks

### High Priority

1. **Complete Enrollment Endpoint**
   - Create `POST /api/enrollments/internal/complete` in Course Service
   - Handle payment verification callback
   - Create enrollment record
   - Update course enrollment count

2. **Payment Webhook Handler**
   - Create webhook endpoint in Payment Service
   - Handle Stripe/Razorpay webhooks
   - Auto-complete enrollment on successful payment

3. **Service Auth Middleware**
   - Ensure all internal endpoints use `serviceAuthMiddleware`
   - Verify HMAC signatures
   - Validate service API keys

### Medium Priority

4. **Enrollment Validation**
   - Check for existing enrollment before payment
   - Prevent duplicate enrollments
   - Handle re-enrollment for dropped courses

5. **Refund Flow**
   - Implement `POST /api/payments/:id/refund`
   - Drop enrollment on refund
   - Calculate prorated refunds

6. **Video Processing Webhooks**
   - Handle Mux webhooks in File Service
   - Update lecture status
   - Notify Course Service of completion

### Low Priority

7. **Caching Layer**
   - Cache course details in Payment Service
   - Cache user enrollments
   - Implement Redis for session storage

8. **Event-Driven Architecture**
   - Publish events for enrollment created
   - Subscribe to payment events
   - Async notification sending

## API Contract Summary

### Internal Service Endpoints

#### Course Service Internal
```
GET    /internal/course/:id              - Get course details
POST   /api/enrollments/internal/complete - Complete enrollment (MISSING)
POST   /api/enrollments/internal/drop     - Drop enrollment (MISSING)
```

#### Payment Service Internal
```
POST   /api/payments/internal/create      - Create payment
GET    /api/payments/internal/:id         - Get payment status
```

#### File Service Internal
```
POST   /api/files/internal/presigned-url  - Generate upload URL
POST   /api/files/internal/confirm/:id    - Confirm upload
GET    /api/files/internal/:id            - Get file details
DELETE /api/files/internal/:id            - Delete file
```

## Configuration Requirements

### Environment Variables

```bash
# Service URLs (Internal)
USER_SERVICE_URL=http://user-service:3001
COURSE_SERVICE_URL=http://course-service:3002
PAYMENT_SERVICE_URL=http://payment-service:3003
FILE_SERVICE_URL=http://file-service:3008

# Service Authentication
SERVICE_SECRET_KEY=shared-secret-for-hmac
COURSE_SERVICE_API_KEY=course-api-key
PAYMENT_SERVICE_API_KEY=payment-api-key
FILE_SERVICE_API_KEY=file-api-key

# External Services
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
MUX_TOKEN_ID=...
MUX_TOKEN_SECRET=...
AWS_S3_BUCKET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Testing the Integration

```bash
# 1. Start all services
pnpm dev

# 2. Register a user
curl -X POST http://localhost:3000/api/user/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 3. Login
curl -X POST http://localhost:3000/api/user/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 4. Create a course (as teacher)
curl -X POST http://localhost:3000/api/course/courses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Course","price":99.99}'

# 5. Enroll in course
curl -X POST http://localhost:3000/api/course/enrollments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"courseId":"<course-id>"}'

# 6. Create payment
curl -X POST http://localhost:3000/api/payment/payments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "<course-id>",
    "amount": 99.99,
    "currency": "USD",
    "paymentMethod": "stripe"
  }'
```
