# End-to-End Flow Implementation Guide

## Overview

This document describes the implemented end-to-end flows connecting User Service, Course Service, Payment Service, and File Service.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                          │
│                              (Web App / Mobile App)                                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY (Port 3000)                                     │
│                    (Authentication, Rate Limiting, Routing)                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
       ┌───────────────────────────────────┼───────────────────────────────────┐
       │                                   │                                   │
       ▼                                   ▼                                   ▼
┌──────────────┐                ┌──────────────┐                ┌──────────────┐
│User Service  │                │Course Service│                │Payment Service│
│(Port 3001)   │◄──────────────►│(Port 3002)   │◄──────────────►│(Port 3003)   │
│              │   Auth Verify  │              │  Enroll/Payment│              │
│ • Register   │                │ • Courses    │                │ • Stripe     │
│ • Login      │                │ • Enrollments│                │ • Razorpay   │
│ • JWT        │                │ • Chapters   │                │ • Webhooks   │
└──────────────┘                └──────┬───────┘                └──────┬───────┘
                                       │                               │
                                       │                               │
                                       ▼                               ▼
                              ┌──────────────┐                ┌──────────────┐
                              │ File Service │                │   External   │
                              │(Port 3008)   │                │   Gateways   │
                              │              │                │ (Stripe/Raz) │
                              │ • S3 Upload  │                └──────────────┘
                              │ • Mux Video  │
                              │ • Streaming  │
                              └──────────────┘
```

## Implemented Flows

### Flow 1: User Registration & Authentication

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Client │────▶│ Gateway │────▶│  User   │────▶│   DB    │
│         │     │         │     │ Service │     │         │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │                               │               │
     │                               │               │
     │                               ▼               │
     │                         ┌─────────┐          │
     │                         │  Hash   │          │
     │                         │ Password│          │
     │                         └─────────┘          │
     │                               │               │
     │                               ▼               │
     │                         ┌─────────┐          │
     └────────────────────────▶│  JWT    │◄─────────┘
                               │  Token  │
                               └─────────┘
```

**Endpoints:**
```bash
# Register
POST /api/user/auth/register
Body: { email, password, firstName, lastName }

# Login
POST /api/user/auth/login
Body: { email, password }
Response: { token, refreshToken, user }

# Get Current User
GET /api/user/auth/me
Headers: Authorization: Bearer <token>
```

### Flow 2: Course Purchase & Enrollment (COMPLETE)

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  User   │──▶│ Gateway │──▶│  Auth   │──▶│ Payment │──▶│ Course  │──▶│   DB    │
│         │   │         │   │ Middleware   │ Service │   │ Service │   │         │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
     │                                                              │
     │                                                              │
     │    ┌─────────────────────────────────────────────────────────┘
     │    │ Internal API Call (Service-to-Service)
     │    │ POST /internal/enrollments/complete
     │    │ Headers: x-service-api-key, x-signature
     │    │
     ▼    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ENROLLMENT CREATED                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Step-by-Step Flow:**

1. **Create Payment** (Payment Service)
```bash
POST /api/payment/payments
Headers: Authorization: Bearer <jwt>
Body: {
  "courseId": "uuid",
  "amount": 99.99,
  "currency": "USD",
  "paymentMethod": "stripe"  // or "razorpay"
}
Response: {
  "gatewayOrderId": "pi_xxx",  // Stripe PaymentIntent ID
  "clientSecret": "pi_xxx_secret_xxx",
  "amount": 99.99,
  "currency": "USD"
}
```

2. **Complete Payment** (Client → Stripe/Razorpay)
```javascript
// Using Stripe.js
const result = await stripe.confirmPayment({
  clientSecret: response.clientSecret,
  payment_method: { /* card details */ }
});
```

3. **Verify Payment** (Payment Service)
```bash
POST /api/payment/payments/:paymentId/verify
Headers: Authorization: Bearer <jwt>
Body: {
  "paymentGatewayId": "pi_xxx",
  "signature": "..."  // For Razorpay
}
```

4. **Internal: Complete Enrollment** (Payment Service → Course Service)
```bash
POST /internal/enrollments/complete
Headers: 
  x-service-api-key: <api-key>
  x-service-id: payment-service
  x-timestamp: <timestamp>
  x-signature: <hmac-signature>
Body: {
  "userId": "uuid",
  "courseId": "uuid",
  "paymentId": "uuid"
}
```

5. **Enrollment Created** (Course Service)
- Creates enrollment record
- Updates course enrollment count
- Returns enrollment details

### Flow 3: Video Upload & Processing

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│ Teacher │──▶│ Gateway │──▶│ Course  │──▶│  File   │──▶│   S3    │
│         │   │         │   │ Service │   │ Service │   │         │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
     │                                              │
     │                                              │
     │         ┌────────────────────────────────────┘
     │         │ Webhook: Mux processing complete
     │         │
     ▼         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LECTURE UPDATED                              │
│         (videoUrl, thumbnailUrl, duration)                       │
└─────────────────────────────────────────────────────────────────┘
```

**Step-by-Step Flow:**

1. **Initiate Upload** (Course Service)
```bash
POST /api/course/lectures/:lectureId/upload
Headers: Authorization: Bearer <jwt>
Body: {
  "fileName": "lesson1.mp4",
  "fileSize": 104857600,
  "contentType": "video/mp4"
}
```

2. **Generate Presigned URL** (Course Service → File Service)
```bash
POST /api/files/internal/presigned-url
Headers: Service-to-Service Auth
Body: {
  "courseId": "uuid",
  "lectureId": "uuid",
  "fileName": "lesson1.mp4",
  "fileSize": 104857600,
  "contentType": "video/mp4"
}
Response: {
  "fileId": "uuid",
  "uploadUrl": "https://s3-presigned-url...",
  "expiresAt": "2024-01-01T00:00:00Z"
}
```

3. **Upload to S3** (Client)
```bash
PUT https://s3-presigned-url...
Body: <video file>
```

4. **Confirm Upload** (Course Service)
```bash
POST /api/course/lectures/:lectureId/confirm-upload
Body: { "fileId": "uuid" }
```

5. **Video Processing** (File Service → Mux)
- File Service uploads to Mux
- Mux processes video (transcoding)
- Webhook updates status

6. **Get Video Status** (Client)
```bash
GET /api/course/lectures/:lectureId/status
Response: {
  "status": "processing",  // or "completed", "failed"
  "progress": 75
}
```

7. **Playback Ready**
```bash
GET /api/course/lectures/:lectureId
Response: {
  "videoUrl": "https://stream.mux.com/playback-id.m3u8",
  "thumbnailUrl": "https://image.mux.com/playback-id/thumbnail.jpg",
  "duration": 3600
}
```

### Flow 4: Progress Tracking

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│ Student │──▶│ Gateway │──▶│ Course  │──▶│   DB    │
│         │   │         │   │ Service │   │         │
└─────────┘   └─────────┘   └─────────┘   └─────────┘
     │                              │
     │                              │
     │    ┌─────────────────────────┘
     │    │ Progress >= 100% ?
     │    │
     ▼    ▼
┌─────────────────────────────────────────────────────┐
│              CERTIFICATE GENERATED                   │
└─────────────────────────────────────────────────────┘
```

**Update Progress:**
```bash
PATCH /api/course/enrollments/course/:courseId/progress
Headers: Authorization: Bearer <jwt>
Body: {
  "progressPercentage": 75.5,
  "totalWatchTime": 3600  // seconds
}
```

**Auto-complete when progress >= 100%:**
- Enrollment status changed to "completed"
- Completion date recorded
- Certificate generated (if applicable)

### Flow 5: Refund Flow

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  User   │──▶│ Gateway │──▶│ Payment │──▶│  Ext    │──▶│ Course  │
│         │   │         │   │ Service │   │ Gateway │   │ Service │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
     │                                                      │
     │                                                      │
     │    ┌─────────────────────────────────────────────────┘
     │    │ Internal: POST /internal/enrollments/drop
     │    │
     ▼    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ENROLLMENT DROPPED                            │
└─────────────────────────────────────────────────────────────────┘
```

**Request Refund:**
```bash
POST /api/payment/payments/:paymentId/refund
Headers: Authorization: Bearer <jwt>
Body: {
  "amount": 99.99,  // Optional: partial refund
  "reason": "User requested"
}
```

**Process:**
1. Payment Service verifies payment is completed
2. Calls external gateway (Stripe/Razorpay) for refund
3. Updates payment status to "refunded"
4. Calls Course Service to drop enrollment
5. Returns refund confirmation

## Service-to-Service Authentication

All internal service calls use HMAC-based authentication:

```typescript
// Headers sent with every internal request
{
  'x-service-api-key': 'course-service-api-key',
  'x-service-id': 'payment-service',
  'x-timestamp': '1704067200',
  'x-signature': 'hmac-sha256-signature'
}

// Signature generation
const payload = `${serviceId}:${timestamp}:${JSON.stringify(body)}`;
const signature = crypto
  .createHmac('sha256', SERVICE_SECRET_KEY)
  .update(payload)
  .digest('hex');
```

## API Gateway Routing

```yaml
# API Gateway routes configuration
routes:
  # User Service
  - path: /api/user
    target: http://user-service:3001
    stripPrefix: /api/user
    
  # Course Service
  - path: /api/course
    target: http://course-service:3002
    stripPrefix: /api/course
    
  # Payment Service
  - path: /api/payment
    target: http://payment-service:3003
    stripPrefix: /api/payment
    
  # File Service
  - path: /api/file
    target: http://file-service:3008
    stripPrefix: /api/file
```

## Database Relationships

```
users (user-service)
  │
  ├───► user_profiles (1:1)
  │
  ├───► enrollments (1:N) ────► courses (N:1)
  │                              │
  │                              ├───► course_chapters (1:N)
  │                              │       └───► course_lectures (1:N)
  │                              │               └───► files (1:1)
  │                              │
  │                              └───► payments (1:N)
  │
  └───► followers (N:M)
```

## Testing the Flows

### 1. Complete Purchase Flow Test

```bash
# 1. Register and login
TOKEN=$(curl -s -X POST http://localhost:3000/api/user/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.token')

# 2. Create a course (as teacher)
COURSE_ID=$(curl -s -X POST http://localhost:3000/api/course/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Course","price":99.99,"status":"published"}' | jq -r '.data.id')

# 3. Create payment
PAYMENT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/payment/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\":\"$COURSE_ID\",\"amount\":99.99,\"currency\":\"USD\",\"paymentMethod\":\"stripe\"}")

PAYMENT_ID=$(echo $PAYMENT_RESPONSE | jq -r '.data.paymentId')

# 4. Verify payment (after Stripe confirmation)
curl -X POST http://localhost:3000/api/payment/payments/$PAYMENT_ID/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentGatewayId":"pi_xxx","signature":"..."}'

# 5. Check enrollment
curl http://localhost:3000/api/course/enrollments/me \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Video Upload Flow Test

```bash
# 1. Create lecture
LECTURE_ID=$(curl -s -X POST http://localhost:3000/api/course/lectures \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courseId":"'$COURSE_ID'","title":"Test Lecture"}' | jq -r '.data.id')

# 2. Initiate upload
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3000/api/course/lectures/$LECTURE_ID/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","fileSize":10485760,"contentType":"video/mp4"}')

UPLOAD_URL=$(echo $UPLOAD_RESPONSE | jq -r '.data.uploadUrl')
FILE_ID=$(echo $UPLOAD_RESPONSE | jq -r '.data.fileId')

# 3. Upload to S3
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  --data-binary @test.mp4

# 4. Confirm upload
curl -X POST http://localhost:3000/api/course/lectures/$LECTURE_ID/confirm-upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileId":"'$FILE_ID'"}'
```

## Error Handling

### Service Unavailable
```json
{
  "success": false,
  "error": "Service temporarily unavailable",
  "service": "payment-service",
  "retryAfter": 30
}
```

### Authentication Failed
```json
{
  "success": false,
  "error": "Invalid or expired token",
  "code": "AUTH_001"
}
```

### Payment Failed
```json
{
  "success": false,
  "error": "Payment verification failed",
  "paymentStatus": "failed",
  "gatewayError": "Card declined"
}
```

## Monitoring Points

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Payment Success Rate | Payment Service | < 95% |
| Enrollment Creation Time | Course Service | > 2s |
| Video Processing Time | File Service | > 10 min |
| Service-to-Service Latency | All Services | > 500ms |
| Failed Refunds | Payment Service | > 1% |
