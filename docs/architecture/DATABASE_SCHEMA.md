# Database Schema Documentation

## Overview

The LMS uses PostgreSQL with Drizzle ORM for database management. All schemas are defined in the `@lms/database` library and shared across services.

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USERS MODULE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐            │
│  │    users     │◄──────┤user_profiles │       │user_auth_    │            │
│  │──────────────│       │──────────────│       │  methods     │            │
│  │ id (PK)      │       │ id (PK)      │       │──────────────│            │
│  │ email (UQ)   │◄──────┤ user_id (FK) │       │ id (PK)      │            │
│  │ phone (UQ)   │       │ first_name   │       │ user_id (FK) │            │
│  │ password_hash│       │ last_name    │       │ auth_method  │            │
│  │ role         │       │ display_name │       │ provider_id  │            │
│  │ status       │       │ bio          │       │ provider_data│            │
│  │ email_verified│      │ avatar_url   │       │ is_primary   │            │
│  │ phone_verified│      │ date_of_birth│       └──────────────┘            │
│  │ created_at   │       │ country      │                                  │
│  │ updated_at   │       │ timezone     │                                  │
│  │ last_login   │       │ preferred_lang│                                 │
│  │ login_attempts│      └──────────────┘                                  │
│  │ locked_until │                                                          │
│  └──────┬───────┘                                                          │
│         │                                                                   │
│         │         ┌──────────────┐                                         │
│         └────────►│   followers  │                                         │
│                   │──────────────│                                         │
│                   │ id (PK)      │                                         │
│                   │ follower_id  │                                         │
│                   │ following_id │                                         │
│                   │ created_at   │                                         │
│                   └──────────────┘                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                             COURSES MODULE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐            │
│  │   courses    │◄──────┤course_chapter│◄──────┤course_lecture│            │
│  │──────────────│       │     s        │       │     s        │            │
│  │ id (PK)      │       │──────────────│       │──────────────│            │
│  │ teacher_id   │       │ id (PK)      │       │ id (PK)      │            │
│  │ category_id  │       │ course_id(FK)│       │ course_id(FK)│            │
│  │ title        │       │ title        │       │ chapter_id   │            │
│  │ slug (UQ)    │       │ description  │       │ title        │            │
│  │ description  │       │ sort_order   │       │ description  │            │
│  │ thumbnail_url│       │ is_active    │       │ content_type │            │
│  │ trailer_url  │       │ created_at   │       │ video_url    │            │
│  │ difficulty   │       │ updated_at   │       │ video_duration│           │
│  │ status       │       └──────────────┘       │ video_mux_id │            │
│  │ pricing_type │                              │ pdf_url      │            │
│  │ price        │                              │ text_content │            │
│  │ discount_price│                             │ is_preview   │            │
│  │ duration_*   │                              │ is_download  │            │
│  │ language     │                              │ sort_order   │            │
│  │ prerequisites│                              │ is_active    │            │
│  │ what_you_learn│                             │ created_at   │            │
│  │ target_audience│                            │ updated_at   │            │
│  │ requirements │                              └──────────────┘            │
│  │ tags         │                                                          │
│  │ is_featured  │                                                          │
│  │ is_bestseller│                                                          │
│  │ max_students │                                                          │
│  │ certificate_*│                                                          │
│  │ total_*      │                                                          │
│  │ avg_rating   │                                                          │
│  │ published_at │                                                          │
│  └──────┬───────┘                                                          │
│         │                                                                   │
│         │         ┌──────────────┐                                         │
│         ├────────►│  categories  │                                         │
│         │         │──────────────│                                         │
│         │         │ id (PK)      │                                         │
│         │         │ name         │                                         │
│         │         │ slug (UQ)    │                                         │
│         │         │ description  │                                         │
│         │         │ parent_id    │                                         │
│         │         │ icon_url     │                                         │
│         │         └──────────────┘                                         │
│         │                                                                   │
│         │         ┌──────────────┐       ┌──────────────┐                  │
│         ├────────►│  enrollments │       │   reviews    │                  │
│         │         │──────────────│       │──────────────│                  │
│         │         │ id (PK)      │       │ id (PK)      │                  │
│         │         │ user_id (FK) │       │ course_id(FK)│                  │
│         │         │ course_id(FK)│       │ user_id (FK) │                  │
│         │         │ status       │       │ rating       │                  │
│         │         │ progress     │       │ comment      │                  │
│         │         │ enrolled_at  │       │ is_featured  │                  │
│         │         │ completed_at │       │ helpful_count│                  │
│         │         │ expiry_date  │       │ created_at   │                  │
│         │         └──────────────┘       └──────────────┘                  │
│         │                                                                   │
│         │         ┌──────────────┐                                         │
│         └────────►│user_interests│                                         │
│                   │──────────────│                                         │
│                   │ id (PK)      │                                         │
│                   │ user_id (FK) │                                         │
│                   │ category_id  │                                         │
│                   │ interest_name│                                         │
│                   │ priority     │                                         │
│                   └──────────────┘                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            PAYMENTS MODULE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐            │
│  │   payments   │◄──────┤  payouts     │       │subscriptions │            │
│  │──────────────│       │──────────────│       │──────────────│            │
│  │ id (PK)      │       │ id (PK)      │       │ id (PK)      │            │
│  │ user_id (FK) │       │ user_id (FK) │       │ user_id (FK) │            │
│  │ course_id(FK)│       │ amount       │       │ plan_id      │            │
│  │ amount       │       │ currency     │       │ status       │            │
│  │ currency     │       │ status       │       │ current_     │            │
│  │ status       │       │ method       │       │   period_end │            │
│  │ method       │       │ reference    │       │ cancel_at_   │            │
│  │ provider_id  │       │ created_at   │       │   period_end │            │
│  │ provider_data│       └──────────────┘       └──────────────┘            │
│  │ metadata     │                                                          │
│  └──────────────┘                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          ASSESSMENTS MODULE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐            │
│  │  assessments │◄──────┤   questions  │       │   attempts   │            │
│  │──────────────│       │──────────────│       │──────────────│            │
│  │ id (PK)      │       │ id (PK)      │       │ id (PK)      │            │
│  │ course_id(FK)│       │ assessment_id│       │ assessment_id│            │
│  │ title        │       │ type         │       │ user_id (FK) │            │
│  │ description  │       │ question     │       │ started_at   │            │
│  │ type         │       │ options      │       │ completed_at │            │
│  │ duration     │       │ correct_ans  │       │ score        │            │
│  │ total_marks  │       │ marks        │       │ status       │            │
│  │ passing_marks│       │ order        │       │ answers      │            │
│  │ shuffle_q    │       └──────────────┘       └──────────────┘            │
│  │ show_result  │                                                          │
│  └──────┬───────┘                                                          │
│         │                                                                   │
│         │         ┌──────────────┐                                         │
│         └────────►│  proctoring  │                                         │
│                   │   sessions   │                                         │
│                   │──────────────│                                         │
│                   │ id (PK)      │                                         │
│                   │ attempt_id   │                                         │
│                   │ violations   │                                         │
│                   │ screenshots  │                                         │
│                   │ ai_analysis  │                                         │
│                   └──────────────┘                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         NOTIFICATIONS MODULE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐       ┌──────────────┐                                    │
│  │notifications │       │notification_ │                                    │
│  │──────────────│       │  templates   │                                    │
│  │ id (PK)      │       │──────────────│                                    │
│  │ user_id (FK) │       │ id (PK)      │                                    │
│  │ type         │       │ name         │                                    │
│  │ title        │       │ subject      │                                    │
│  │ content      │       │ body         │                                    │
│  │ priority     │       │ type         │                                    │
│  │ channel      │       │ variables    │                                    │
│  │ is_read      │       └──────────────┘                                    │
│  │ read_at      │                                                          │
│  └──────────────┘                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          LIVE SESSIONS MODULE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐       ┌──────────────┐                                    │
│  │live_sessions │       │session_      │                                    │
│  │──────────────│       │ participants │                                    │
│  │ id (PK)      │       │──────────────│                                    │
│  │ course_id(FK)│       │ id (PK)      │                                    │
│  │ teacher_id   │       │ session_id   │                                    │
│  │ title        │       │ user_id (FK) │                                    │
│  │ description  │       │ role         │                                    │
│  │ scheduled_at │       │ joined_at    │                                    │
│  │ duration     │       │ left_at      │                                    │
│  │ status       │       └──────────────┘                                    │
│  │ recording_url│                                                          │
│  └──────────────┘                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                             FILES MODULE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐       ┌──────────────┐                                    │
│  │    files     │       │  downloads   │                                    │
│  │──────────────│       │──────────────│                                    │
│  │ id (PK)      │       │ id (PK)      │                                    │
│  │ user_id (FK) │       │ user_id (FK) │                                    │
│  │ entity_type  │       │ file_id (FK) │                                    │
│  │ entity_id    │       │ status       │                                    │
│  │ filename     │       │ expires_at   │                                    │
│  │ original_name│       └──────────────┘                                    │
│  │ mime_type    │                                                          │
│  │ size         │                                                          │
│  │ url          │                                                          │
│  │ storage_type │                                                          │
│  └──────────────┘                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Enum Definitions

### User Enums

```typescript
// User roles in the system
user_role: ['student', 'teacher', 'super_admin']

// Authentication methods supported
auth_method: ['email', 'google', 'apple', 'phone']

// User account status
user_status: ['active', 'inactive', 'suspended', 'pending_verification']
```

### Course Enums

```typescript
// Course difficulty levels
course_difficulty: ['beginner', 'intermediate', 'advanced', 'expert']

// Course publication status
course_status: ['draft', 'published', 'archived', 'under_review']

// Pricing models
pricing_type: ['free', 'paid', 'subscription']
```

### Enrollment Enums

```typescript
// Student enrollment status
enrollment_status: ['active', 'completed', 'dropped', 'expired']
```

### Assessment Enums

```typescript
// Question types supported
question_type: ['mcq', 'multiple_select', 'true_false', 'short_answer', 'long_answer', 'fill_blank']

// Assessment types
test_type: ['quiz', 'assignment', 'final_exam', 'practice']

// Proctoring violation types
violation_type: ['phone_detected', 'multiple_faces', 'no_face', 'looking_away', 
                 'audio_detected', 'tab_switch', 'copy_paste', 'other']
```

### Live Session Enums

```typescript
// Session status
session_status: ['scheduled', 'live', 'ended', 'cancelled']
```

### Payment Enums

```typescript
// Payment transaction status
payment_status: ['pending', 'completed', 'failed', 'refunded', 'cancelled']

// Payment methods supported
payment_method: ['razorpay', 'stripe', 'paypal', 'wallet', 'bank_transfer']
```

### Notification Enums

```typescript
// Notification categories
notification_type: ['course_update', 'payment', 'achievement', 'reminder', 
                    'announcement', 'live_session', 'test_result', 'violation']

// Priority levels
notification_priority: ['low', 'medium', 'high', 'urgent']
```

### File Enums

```typescript
// Downloadable content types
download_type: ['video', 'pdf', 'audio', 'document']

// Download status
download_status: ['pending', 'downloading', 'completed', 'failed', 'expired']
```

## Indexing Strategy

### Users Table Indexes
- `idx_users_email` - For login lookups
- `idx_users_role` - For role-based queries
- `idx_users_status` - For filtering active users
- `idx_users_email_verified` - Partial index for verified emails only

### Courses Table Indexes
- `idx_courses_teacher` - For instructor course listings
- `idx_courses_category` - For category filtering
- `idx_courses_status` - For publication status filtering
- `idx_courses_featured` - For homepage featured courses
- `idx_courses_teacher_status` - Composite for instructor dashboards
- `idx_courses_category_featured` - For category page optimization
- `idx_courses_published` - Partial index for published courses only

### Enrollments Table Indexes
- `idx_enrollments_user` - For student enrollment lookups
- `idx_enrollments_course` - For course enrollment counts
- `idx_enrollments_user_course` - Unique constraint composite

### Performance Considerations

1. **Foreign Key Indexes**: All foreign keys are automatically indexed by PostgreSQL
2. **Composite Indexes**: Used for common query patterns (e.g., teacher + status)
3. **Partial Indexes**: Applied to status fields for active records
4. **Text Search**: Consider adding GIN indexes for full-text search on descriptions

## Data Integrity

### Constraints
- **Unique Constraints**: Email, phone, course slugs, enrollment combinations
- **Check Constraints**: Positive prices, valid email format
- **Foreign Keys**: Cascading deletes where appropriate
- **Not Null**: Required fields enforced at database level

### Soft Deletes
Currently using hard deletes. Consider adding `deleted_at` timestamps for:
- Users (GDPR compliance)
- Courses (preserve enrollment history)
- Content (allow recovery)

## Migration Strategy

### Current Approach
- Drizzle Kit for schema generation
- Custom migration runner per service
- Version-controlled migration files

### Best Practices
1. Always create backward-compatible migrations
2. Test migrations on staging data
3. Use transactions for multi-step migrations
4. Document breaking changes
5. Maintain migration rollback scripts
