# LMS Backend Microservices

A comprehensive Learning Management System backend built with Node.js, TypeScript, and microservices architecture.

## 🏗️ Architecture

### Services
- **API Gateway** (Port 3000) - Central entry point with routing and rate limiting
- **User Service** (Port 3001) - Authentication, authorization, user management
- **Course Service** (Port 3002) - Course creation, management, content delivery
- **Payment Service** (Port 3003) - Payments, subscriptions, billing
- **Assessment Service** (Port 3004) - Quizzes, exams, AI proctoring
- **Analytics Service** (Port 3005) - Tracking, reporting, insights
- **Notification Service** (Port 3006) - Email, push notifications, SMS
- **Live Session Service** (Port 3007) - Real-time video sessions
- **File Service** (Port 3008) - File upload, storage, streaming

### Shared Libraries
- **@lms/common** - Shared utilities, middleware, types
- **@lms/database** - Database schemas, migrations, seeds

- **@lms/logger** - Centralized logging
- **@lms/validation** - Input validation schemas
- **@lms/types** - TypeScript type definitions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- pnpm 8+

### Installation

1. **Clone and setup:**
```bash
git clone <repository-url>
cd lms-backend
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
