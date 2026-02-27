# LMS Backend System Overview

## Executive Summary

The LMS (Learning Management System) backend is a comprehensive microservices architecture built with Node.js, TypeScript, PostgreSQL, Drizzle ORM, and pnpm workspaces. It provides a scalable foundation for online learning platforms with support for courses, assessments, payments, live sessions, and analytics.

## Architecture Principles

1. **Microservices Pattern**: Each service is independently deployable and scalable
2. **Database Per Service**: Shared library approach with schema separation
3. **API Gateway**: Single entry point for all client requests
4. **Event-Driven**: Support for async communication via message queues
5. **Security First**: JWT authentication, RBAC authorization, service-to-service auth

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API Gateway (3000)                              │
│  - Request routing, rate limiting, authentication, CORS, compression        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────┬───────────────┼───────────────┬─────────────┐
        ▼             ▼               ▼               ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ User Service │ │ Course   │ │ Payment      │ │Assessment│ │ Notification │
│   (3001)     │ │ Service  │ │ Service      │ │ Service  │ │  Service     │
│              │ │ (3002)   │ │   (3003)     │ │  (3004)  │ │   (3006)     │
│ • Auth/JWT   │ │          │ │              │ │          │ │              │
│ • RBAC       │ │ • Course │ │ • Stripe     │ │ • Quizzes│ │ • Email      │
│ • Profiles   │ │ • Chapter│ │ • Razorpay   │ │ • Exams  │ │ • Push       │
│ • Followers  │ │ • Lecture│ │ • Webhooks   │ │ • AI      │ │ • SMS        │
└──────────────┘ │ • Enroll │ │ • Payouts    │ │ Proctor  │ └──────────────┘
                 │ • Reviews│ └──────────────┘ └──────────┘
                 └──────────┘
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        ▼              ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Analytics  │ │ Live Session │ │ File Service │ │   Shared     │
│   Service    │ │   Service    │ │   (3008)     │ │   Database   │
│    (3005)    │ │    (3007)    │ │              │ │   (Lib)      │
│              │ │              │ │              │ │              │
│ • Tracking   │ │ • WebRTC     │ │ • S3 Upload  │ │ • Schemas    │
│ • Reporting  │ │ • Socket.IO  │ │ • Mux Video  │ │ • Migrations │
│ • Insights   │ │ • Mediasoup  │ │ • Streaming  │ │ • Seeds      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

## Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Runtime | Node.js | 18+ | JavaScript runtime |
| Package Manager | pnpm | 10.13.1 | Monorepo management |
| Language | TypeScript | 5.8.3 | Type-safe development |
| Database | PostgreSQL | 15+ | Primary data store |
| ORM | Drizzle ORM | 0.44.4 | Database operations |
| Cache/Queue | Redis | 7+ | Caching and sessions |
| API Framework | Express.js | 5.1.0 | HTTP server |
| Validation | Zod | 4.0.10 | Schema validation |
| Auth | JWT + Firebase Admin | 9.0.2 | Authentication |
| Testing | Vitest | 3.2.4 | Unit testing |
| WebSocket | Socket.IO | 4.8.1 | Real-time communication |
| Video | Mux, Mediasoup | - | Video streaming |
| Payments | Stripe, Razorpay | - | Payment processing |

## Service Responsibilities

### API Gateway (Port 3000)
- **Purpose**: Central entry point for all client requests
- **Key Features**:
  - Request routing to appropriate services
  - Rate limiting (configurable per endpoint)
  - CORS handling
  - Request/response compression
  - Authentication middleware integration
  - Load balancing preparation

### User Service (Port 3001)
- **Purpose**: User management and authentication
- **Key Features**:
  - JWT token generation and validation
  - User registration and login
  - Profile management
  - Social authentication (Google, Apple)
  - Two-factor authentication
  - Follower/following system
  - RBAC permission verification endpoint

### Course Service (Port 3002)
- **Purpose**: Course content management
- **Key Features**:
  - Course CRUD operations
  - Chapter and lecture management
  - Enrollment handling
  - Progress tracking
  - Review and rating system
  - Category management

### Payment Service (Port 3003)
- **Purpose**: Payment processing and billing
- **Key Features**:
  - Stripe integration
  - Razorpay integration
  - Webhook handling
  - Subscription management
  - Payout processing
  - Invoice generation

### Assessment Service (Port 3004)
- **Purpose**: Quiz and exam management
- **Key Features**:
  - Quiz creation and management
  - Exam scheduling
  - AI proctoring with YOLO
  - Real-time monitoring via WebSocket
  - Anti-cheating detection
  - Result calculation

### Analytics Service (Port 3005)
- **Purpose**: Data tracking and reporting
- **Key Features**:
  - User activity tracking
  - Course performance metrics
  - Revenue analytics
  - Custom report generation
  - Data visualization support

### Notification Service (Port 3006)
- **Purpose**: Multi-channel notifications
- **Key Features**:
  - Email notifications (Nodemailer)
  - Push notifications (Firebase)
  - SMS notifications (Twilio)
  - Notification templates
  - Preference management

### Live Session Service (Port 3007)
- **Purpose**: Real-time video conferencing
- **Key Features**:
  - WebRTC support
  - Mediasoup SFU
  - Screen sharing
  - Chat functionality
  - Recording capability

### File Service (Port 3008)
- **Purpose**: File storage and streaming
- **Key Features**:
  - AWS S3 integration
  - MinIO support
  - Mux video processing
  - Image optimization (Sharp)
  - Presigned URL generation

## Shared Libraries

### @lms/common
Shared utilities, middleware, and constants used across all services.

**Exports**:
- Error handling middleware
- Validation utilities
- HTTP status codes
- Common types

### @lms/database
Centralized database schemas and connection management using Drizzle ORM.

**Exports**:
- Database connection pool
- All table schemas
- Migration utilities
- Type definitions

### @lms/logger
Winston-based logging with daily rotation.

**Exports**:
- Logger instance
- Log levels configuration
- File transport setup

### @lms/shared-auth
Inter-service authentication client for secure communication.

**Exports**:
- AuthClient for service-to-service calls
- Authentication middleware factory
- Authorization middleware factory
- Protected route factory

## Data Flow

### Authentication Flow
```
Client → API Gateway → User Service (Verify) → JWT Token → Client
                                    ↓
                              Other Services (Verify via User Service)
```

### Service-to-Service Communication
```
Service A → AuthClient → HMAC Signature → User Service (Verify)
                                              ↓
                                        Permission Check → Response
```

### Database Access Pattern
```
Service → @lms/database → Drizzle ORM → PostgreSQL
```

## Security Architecture

### Authentication Layers
1. **Client Authentication**: JWT tokens
2. **Service Authentication**: HMAC-signed requests with API keys
3. **Database Authentication**: Connection string with credentials

### Authorization
- **RBAC**: Role-based access control (student, teacher, super_admin)
- **Resource-level**: Permission checks per resource and action
- **Context-aware**: Additional context for fine-grained control

### Data Protection
- Password hashing (bcrypt)
- HTTPS/TLS for all communications
- CORS configuration
- Rate limiting
- Input validation (Zod)

## Scalability Considerations

### Horizontal Scaling
- Stateless services (easy to replicate)
- Database read replicas
- Redis cluster for caching
- Load balancer ready

### Performance Optimizations
- Database indexing (defined in schemas)
- Response compression
- Connection pooling
- Query optimization via Drizzle

### Caching Strategy
- Redis for session storage
- Response caching (preparation)
- CDN for static assets (preparation)

## Deployment Architecture

### Development
```
Docker Compose → All Services + PostgreSQL + Redis
```

### Production (Recommended)
```
CDN → WAF → Load Balancer → API Gateway → Services (K8s)
                                    ↓
                              Service Mesh (Istio)
                                    ↓
                        PostgreSQL + Redis + Message Queue
```

## Monitoring and Observability

### Health Checks
Each service exposes `/health` endpoint with:
- Service status
- Database connectivity
- Dependencies status
- Uptime metrics

### Logging
- Structured logging with Winston
- Correlation IDs for request tracing
- Log rotation and retention

### Metrics (Preparation)
- Prometheus-compatible endpoints
- Custom business metrics
- Performance metrics

## Future Enhancements

### Phase 1: Foundation
- Complete service implementations
- Standardize error handling
- Fix inconsistencies

### Phase 2: Infrastructure
- Kubernetes deployment
- CI/CD pipeline
- Infrastructure as Code

### Phase 3: Observability
- Distributed tracing
- Centralized logging
- Monitoring dashboards

### Phase 4: Advanced Features
- GraphQL federation
- Event sourcing
- Saga pattern
- CQRS implementation
