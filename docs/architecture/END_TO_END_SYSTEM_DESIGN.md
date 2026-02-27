# End-to-End System Design

## System Architecture Overview

This document describes the complete end-to-end system design for the LMS platform, covering all aspects from user request to data persistence.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │   Web App    │  │  Mobile App  │  │   Admin      │  │   Partner    │                │
│  │  (React)     │  │ (React Native)│  │   Portal     │  │    API       │                │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                │
└─────────┼─────────────────┼─────────────────┼─────────────────┼────────────────────────┘
          │                 │                 │                 │
          └─────────────────┴────────┬────────┴─────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   EDGE LAYER                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              CDN (CloudFront)                                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │   │
│  │  │   Static     │  │   Video      │  │   Images     │  │   API        │        │   │
│  │  │   Assets     │  │   Streaming  │  │   Optimized  │  │   Cache      │        │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SECURITY LAYER                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              WAF (AWS WAF)                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │   │
│  │  │   DDoS       │  │   SQL        │  │   Rate       │  │   Bot        │        │   │
│  │  │  Protection  │  │  Injection   │  │  Limiting    │  │  Detection   │        │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               LOAD BALANCING LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           Application Load Balancer                              │   │
│  │                    (SSL Termination, Health Checks, Routing)                     │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY LAYER                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              API Gateway (K8s)                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │   │
│  │  │  Auth        │  │  Rate        │  │  Request     │  │  Response    │        │   │
│  │  │  Middleware  │  │  Limiting    │  │  Routing     │  │  Transform   │        │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │   │
│  │  │  JWT         │  │  API Key     │  │  CORS        │  │  Logging     │        │   │
│  │  │  Validation  │  │  Validation  │  │  Handling    │  │  & Tracing   │        │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
           ▼                         ▼                         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Service   │    │ Course Service  │    │ Payment Service │
│   (Port 3001)   │    │   (Port 3002)   │    │   (Port 3003)   │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│Assessment Svc   │    │Analytics Svc    │    │Notification Svc │
│  (Port 3004)    │    │  (Port 3005)    │    │  (Port 3006)    │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│Live Session Svc │    │  File Service   │    │  Message Queue  │
│  (Port 3007)    │    │  (Port 3008)    │    │   (RabbitMQ)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               SERVICE MESH LAYER                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              Istio/Linkerd                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │   │
│  │  │    mTLS      │  │  Circuit     │  │   Traffic    │  │   Observ-    │        │   │
│  │  │              │  │  Breaker     │  │   Splitting  │  │   ability    │        │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                DATA LAYER                                                │
│                                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │    PostgreSQL       │  │       Redis         │  │    Elasticsearch    │              │
│  │    (Primary)        │  │     (Cluster)       │  │      (Search)       │              │
│  │                     │  │                     │  │                     │              │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │              │
│  │  │    Master     │  │  │  │   Primary     │  │  │  │   Cluster     │  │              │
│  │  └───────┬───────┘  │  │  └───────┬───────┘  │  │  └───────┬───────┘  │              │
│  │          │          │  │          │          │  │          │          │              │
│  │  ┌───────┴───────┐  │  │  ┌───────┴───────┐  │  │  ┌───────┴───────┐  │              │
│  │  │    Replica    │  │  │  │   Replica     │  │  │  │    Nodes      │  │              │
│  │  └───────────────┘  │  │  └───────────────┘  │  │  └───────────────┘  │              │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘              │
│                                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │    AWS S3           │  │    RabbitMQ         │  │    ClickHouse       │              │
│  │   (File Storage)    │  │   (Message Queue)   │  │  (Analytics DB)     │              │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Request Flow

### 1. User Login Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Client │────▶│     CDN     │────▶│     WAF     │────▶│     ALB     │────▶│   Gateway   │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                                    │
                                                                                    ▼
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Client │◄────│  JWT Token  │◄────│  Generate   │◄────│  Validate   │◄────│User Service │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                                    │
                                                                                    ▼
                                                                           ┌─────────────┐
                                                                           │  PostgreSQL │
                                                                           └─────────────┘
```

**Steps:**
1. User submits credentials via HTTPS
2. Request flows through CDN, WAF, ALB
3. API Gateway validates request format
4. Request routed to User Service
5. User Service validates credentials against PostgreSQL
6. JWT token generated and returned
7. Token cached in Redis for validation

### 2. Course Enrollment Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Client │────▶│   Gateway   │────▶│Auth Middleware│────▶│   Verify    │
└─────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                               │
                                                               ▼
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Client │◄────│  Confirm    │◄────│   Create    │◄────│   Course    │
└─────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                               │
                    ┌───────────────────────────────────────────┘
                    │
                    ▼
           ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
           │   Payment   │────▶│   Stripe    │────▶│   Confirm   │
           │   Service   │     │   API       │     │   Payment   │
           └─────────────┘     └─────────────┘     └─────────────┘
                    │
                    ▼
           ┌─────────────┐     ┌─────────────┐
           │  Notification│────▶│   Email     │
           │   Service   │     │   Queue     │
           └─────────────┘     └─────────────┘
```

**Steps:**
1. Client sends enrollment request with JWT
2. Gateway validates JWT
3. Course Service checks availability
4. Payment Service processes payment
5. Enrollment record created
6. Notification queued for confirmation email
7. Analytics event published

### 3. Live Session Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Teacher │────▶│   Gateway   │────▶│  Live Svc   │────▶│  WebRTC     │
└─────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                               │
                                                               ▼
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Student │◄────│   Video     │◄────│   SFU       │◄────│  Mediasoup  │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                               │
                                                               ▼
                                                      ┌─────────────┐
                                                      │   Redis     │
                                                      │  (Session)  │
                                                      └─────────────┘
```

**Steps:**
1. Teacher initiates live session
2. Live Session Service creates WebRTC room
3. Mediasoup SFU allocated
4. Students join via WebSocket
5. Video streams routed through SFU
6. Session state maintained in Redis
7. Recording saved to S3 (optional)

## Data Flow Patterns

### Synchronous Communication

Used for: User requests requiring immediate response

```
Client → API Gateway → Service → Database → Response
```

**Characteristics:**
- Low latency (< 100ms)
- Strong consistency
- HTTP/REST or gRPC
- Timeout: 30 seconds

### Asynchronous Communication

Used for: Notifications, analytics, background processing

```
Service → Message Queue → Worker → External Service
```

**Characteristics:**
- Eventual consistency
- High throughput
- RabbitMQ/Kafka
- Retry logic built-in

### Event-Driven Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Event Bus                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  User        │  │  Course      │  │  Payment     │          │
│  │  Events      │  │  Events      │  │  Events      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼─────────────────┼─────────────────┼──────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ Notification │  │   Analytics  │  │   Search     │
  │   Service    │  │    Service   │  │    Index     │
  └──────────────┘  └──────────────┘  └──────────────┘
```

**Event Types:**
- `user.registered`
- `course.published`
- `enrollment.completed`
- `payment.successful`
- `assessment.submitted`

## Caching Strategy

### Multi-Layer Caching

```
┌─────────────────────────────────────────────────────────────────┐
│                      CACHE LAYERS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: CDN Cache (Static Assets)                             │
│  ├── Images: 1 year                                             │
│  ├── Videos: 1 year                                             │
│  ├── CSS/JS: 1 week                                             │
│  └── API Responses: 5 minutes                                   │
│                                                                  │
│  Layer 2: Redis Cache (Application Data)                        │
│  ├── User Sessions: 24 hours                                    │
│  ├── Course Catalog: 1 hour                                     │
│  ├── Popular Courses: 15 minutes                                │
│  └── Search Results: 10 minutes                                 │
│                                                                  │
│  Layer 3: In-Memory Cache (Service Level)                       │
│  ├── Configuration: Until restart                               │
│  ├── Permissions: 5 minutes                                     │
│  └── Feature Flags: 1 minute                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cache Invalidation

```typescript
// Write-Through Pattern
async function updateCourse(courseId: string, data: CourseData) {
  // 1. Update database
  const course = await db.update(courses).set(data).where(eq(courses.id, courseId));
  
  // 2. Update cache
  await redis.setex(`course:${courseId}`, 3600, JSON.stringify(course));
  
  // 3. Invalidate related caches
  await redis.del('courses:popular');
  await redis.del(`courses:category:${course.categoryId}`);
  
  // 4. Publish invalidation event
  await eventBus.publish('course.updated', { courseId });
  
  return course;
}
```

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Network Security                                       │
│  ├── VPC with private subnets                                   │
│  ├── Security groups (least privilege)                          │
│  ├── Network ACLs                                               │
│  └── DDoS protection (AWS Shield)                               │
│                                                                  │
│  Layer 2: Application Security                                   │
│  ├── WAF rules (OWASP Top 10)                                   │
│  ├── Rate limiting per IP/user                                  │
│  ├── Input validation (Zod schemas)                             │
│  └── Output encoding                                            │
│                                                                  │
│  Layer 3: Authentication & Authorization                         │
│  ├── JWT tokens with short expiry                               │
│  ├── Refresh token rotation                                     │
│  ├── RBAC with fine-grained permissions                         │
│  └── Service-to-service mTLS                                    │
│                                                                  │
│  Layer 4: Data Security                                          │
│  ├── Encryption at rest (AES-256)                               │
│  ├── Encryption in transit (TLS 1.3)                            │
│  ├── Field-level encryption for PII                             │
│  └── Database audit logging                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  User   │────▶│   Login     │────▶│   Verify    │────▶│   Issue     │
└─────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                               │
                                                               ▼
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  User   │◄────│   Access    │◄────│   Validate  │◄────│   Refresh   │
└─────────┘     │   Resource  │     │   Token     │     │   Token     │
                └─────────────┘     └─────────────┘     └─────────────┘
```

## Scalability Design

### Horizontal Scaling

```
                    ┌─────────────┐
                    │   Load      │
                    │  Balancer   │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  Service    │ │  Service    │ │  Service    │
    │  Pod 1      │ │  Pod 2      │ │  Pod N      │
    │  (Active)   │ │  (Active)   │ │  (Active)   │
    └─────────────┘ └─────────────┘ └─────────────┘
```

### Database Scaling

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE SCALING                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Read Replicas (Horizontal)                                     │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                │
│  │ Replica  │     │ Replica  │     │ Replica  │                │
│  │   1      │     │   2      │     │   N      │                │
│  └────┬─────┘     └────┬─────┘     └────┬─────┘                │
│       └─────────────────┼─────────────────┘                      │
│                         │                                        │
│                    ┌────┴────┐                                   │
│                    │ Primary │                                   │
│                    │  (RW)   │                                   │
│                    └────┬────┘                                   │
│                         │                                        │
│                         ▼                                        │
│                    ┌──────────┐                                  │
│                    │  Write   │                                  │
│                    │  Queue   │                                  │
│                    └──────────┘                                  │
│                                                                  │
│  Sharding (Vertical)                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │ Users    │  │ Courses  │  │ Payments │                       │
│  │ Shard    │  │  Shard   │  │  Shard   │                       │
│  └──────────┘  └──────────┘  └──────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Disaster Recovery

### Multi-Region Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRIMARY REGION                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   EKS        │  │   RDS        │  │   ElastiCache│          │
│  │  Cluster     │  │  Primary     │  │   Primary    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Replication
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SECONDARY REGION                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   EKS        │  │   RDS        │  │   ElastiCache│          │
│  │  Standby     │  │  Replica     │  │   Replica    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Backup Strategy

| Component | Backup Type | Frequency | Retention |
|-----------|-------------|-----------|-----------|
| PostgreSQL | Automated | Daily | 30 days |
| PostgreSQL | Manual | Weekly | 90 days |
| S3 Files | Versioning | Continuous | 1 year |
| Redis | Snapshot | Hourly | 7 days |

## Monitoring and Observability

### Three Pillars

```
┌─────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Metrics (Prometheus)                                           │
│  ├── Request rate                                               │
│  ├── Error rate                                                 │
│  ├── Latency (p50, p95, p99)                                    │
│  ├── Resource utilization                                       │
│  └── Business metrics                                           │
│                                                                  │
│  Logs (ELK Stack)                                               │
│  ├── Application logs                                           │
│  ├── Access logs                                                │
│  ├── Audit logs                                                 │
│  └── Error logs                                                 │
│                                                                  │
│  Traces (Jaeger)                                                │
│  ├── Request flow                                               │
│  ├── Service dependencies                                       │
│  ├── Latency breakdown                                          │
│  └── Error propagation                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Alerting Rules

```yaml
# Critical Alerts
groups:
  - name: critical
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: ServiceDown
        expr: up{job=~"lms-.*"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool near limit"
```

## Performance Optimization

### Latency Budget

| Component | Target | Maximum |
|-----------|--------|---------|
| DNS Lookup | 10ms | 50ms |
| TLS Handshake | 50ms | 100ms |
| API Gateway | 10ms | 30ms |
| Service Processing | 50ms | 200ms |
| Database Query | 20ms | 100ms |
| **Total** | **140ms** | **480ms** |

### Optimization Techniques

1. **Database**
   - Connection pooling (PgBouncer)
   - Query optimization
   - Proper indexing
   - Read replicas for queries

2. **Caching**
   - Multi-layer caching
   - Cache warming
   - Smart invalidation

3. **Network**
   - HTTP/2 and HTTP/3
   - Compression (Brotli)
   - Keep-alive connections
   - Connection pooling

4. **Application**
   - Async processing
   - Batch operations
   - Lazy loading
   - Code splitting
