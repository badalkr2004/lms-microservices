# Production Deployment Guide

This guide provides step-by-step instructions for deploying the LMS backend to production using Kubernetes.

## Prerequisites

### Infrastructure Requirements

- Kubernetes cluster (EKS, GKE, or AKS)
- PostgreSQL 15+ (RDS, Cloud SQL, or Azure Database)
- Redis 7+ (ElastiCache, Memorystore, or Azure Cache)
- Container registry (ECR, GCR, or ACR)
- Domain name with DNS management
- SSL certificates (Let's Encrypt or commercial)

### Tools Required

- kubectl
- helm
- docker
- pnpm
- terraform (optional, for infrastructure provisioning)

## Architecture Overview

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CDN (CloudFront)                        │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      WAF (AWS WAF)                              │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Load Balancer (ALB/NLB)                       │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Ingress Controller (NGINX)                   │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (K8s)                          │
│              ┌──────────────────────────────────┐               │
│              │  Rate Limiting, Auth, Routing    │               │
│              └──────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
    │
    ├───▶ User Service (Port 3001)
    ├───▶ Course Service (Port 3002)
    ├───▶ Payment Service (Port 3003)
    ├───▶ Assessment Service (Port 3004)
    ├───▶ Analytics Service (Port 3005)
    ├───▶ Notification Service (Port 3006)
    ├───▶ Live Session Service (Port 3007)
    └───▶ File Service (Port 3008)

┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │    Redis     │  │   RabbitMQ   │          │
│  │   (Primary)  │  │   (Cluster)  │  │   (Queue)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Steps

### Step 1: Build and Push Docker Images

```bash
# Login to your container registry
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build all images
pnpm docker:build

# Or build individual services
docker build -f deployments/docker/api-gateway.Dockerfile -t lms/api-gateway:latest .
docker build -f deployments/docker/user-service.Dockerfile -t lms/user-service:latest .
docker build -f deployments/docker/course-service.Dockerfile -t lms/course-service:latest .
docker build -f deployments/docker/payment-service.Dockerfile -t lms/payment-service:latest .
docker build -f deployments/docker/assessment-service.Dockerfile -t lms/assessment-service:latest .
docker build -f deployments/docker/analytics-service.Dockerfile -t lms/analytics-service:latest .
docker build -f deployments/docker/notification-service.Dockerfile -t lms/notification-service:latest .
docker build -f deployments/docker/live-session-service.Dockerfile -t lms/live-session-service:latest .
docker build -f deployments/docker/file-service.Dockerfile -t lms/file-service:latest .

# Tag and push to registry
docker tag lms/api-gateway:latest <registry>/lms/api-gateway:v1.0.0
docker push <registry>/lms/api-gateway:v1.0.0

# Repeat for all services...
```

### Step 2: Configure Secrets

Update the secrets with your actual production values:

```bash
# Create production secrets
kubectl apply -f deployments/kubernetes/secrets.yaml

# Or use external secrets manager
# AWS Secrets Manager
# HashiCorp Vault
# Sealed Secrets
```

**Required Secrets:**

| Secret Key | Description | Source |
|------------|-------------|--------|
| DATABASE_URL | PostgreSQL connection string | RDS/Cloud SQL |
| REDIS_URL | Redis connection string | ElastiCache |
| JWT_SECRET | JWT signing key | Generate |
| SERVICE_SECRET_KEY | Inter-service auth | Generate |
| STRIPE_SECRET_KEY | Stripe API key | Stripe Dashboard |
| RAZORPAY_KEY_SECRET | Razorpay secret | Razorpay Dashboard |
| AWS_ACCESS_KEY_ID | AWS credentials | IAM |
| FIREBASE_PRIVATE_KEY | Firebase service account | Firebase Console |
| SMTP_PASS | Email password | Email provider |

### Step 3: Deploy Infrastructure

```bash
# Create namespace
kubectl apply -f deployments/kubernetes/namespace.yaml

# Apply ConfigMaps
kubectl apply -f deployments/kubernetes/configmap.yaml

# Deploy services in order
kubectl apply -f deployments/kubernetes/user-service.yaml
kubectl apply -f deployments/kubernetes/course-service.yaml
kubectl apply -f deployments/kubernetes/payment-service.yaml
kubectl apply -f deployments/kubernetes/assessment-service.yaml
kubectl apply -f deployments/kubernetes/analytics-service.yaml
kubectl apply -f deployments/kubernetes/notification-service.yaml
kubectl apply -f deployments/kubernetes/live-session-service.yaml
kubectl apply -f deployments/kubernetes/file-service.yaml

# Deploy API Gateway last
kubectl apply -f deployments/kubernetes/api-gateway.yaml
```

### Step 4: Database Migrations

```bash
# Run migrations from a pod
kubectl run migrate --rm -i --restart=Never \
  --image=lms/user-service:latest \
  --env="DATABASE_URL=<your-db-url>" \
  -- pnpm db:migrate

# Or run from local machine
export DATABASE_URL="postgresql://..."
pnpm db:migrate
```

### Step 5: Verify Deployment

```bash
# Check pod status
kubectl get pods -n lms

# Check services
kubectl get services -n lms

# Check ingress
kubectl get ingress -n lms

# View logs
kubectl logs -f deployment/api-gateway -n lms

# Test health endpoints
kubectl port-forward svc/api-gateway 3000:3000 -n lms
curl http://localhost:3000/health
```

## Configuration

### Environment Variables

#### API Gateway

| Variable | Default | Description |
|----------|---------|-------------|
| API_GATEWAY_PORT | 3000 | Server port |
| RATE_LIMIT_WINDOW_MS | 900000 | Rate limit window (15 min) |
| RATE_LIMIT_MAX_REQUESTS | 100 | Max requests per window |
| FRONTEND_URL | - | Allowed CORS origin |

#### User Service

| Variable | Default | Description |
|----------|---------|-------------|
| USER_SERVICE_PORT | 3001 | Server port |
| JWT_SECRET | - | JWT signing key |
| JWT_EXPIRES_IN | 7d | Token expiration |
| FIREBASE_PROJECT_ID | - | Firebase project |

#### Database

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | - | PostgreSQL connection |
| DB_POOL_SIZE | 10 | Connection pool size |
| DB_SSL_MODE | require | SSL mode for connections |

### Scaling Configuration

#### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

#### Resource Limits

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| API Gateway | 250m | 500m | 256Mi | 512Mi |
| User Service | 250m | 500m | 256Mi | 512Mi |
| Course Service | 250m | 500m | 256Mi | 512Mi |
| Payment Service | 250m | 500m | 256Mi | 512Mi |
| Assessment Service | 500m | 1000m | 512Mi | 1Gi |
| Analytics Service | 250m | 500m | 256Mi | 512Mi |
| Notification Service | 250m | 500m | 256Mi | 512Mi |
| Live Session Service | 500m | 1000m | 512Mi | 1Gi |
| File Service | 250m | 500m | 512Mi | 1Gi |

## Monitoring and Observability

### Prometheus Metrics

Add Prometheus scraping annotations:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3000"
    prometheus.io/path: "/metrics"
```

### Health Checks

Each service exposes:
- `/health` - Overall health status
- `/health/database` - Database connectivity
- `/metrics` - Prometheus metrics

### Logging

Structured JSON logging is enabled. Configure log aggregation:

```yaml
# Fluentd/Fluent Bit configuration
<match lms.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name lms-logs
</match>
```

### Alerts

Recommended alerts:

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighErrorRate | >5% 5xx errors | Critical |
| HighLatency | p95 > 500ms | Warning |
| PodCrashLoop | Pod restarting >3 times | Critical |
| DatabaseConnectionFail | Cannot connect to DB | Critical |
| DiskSpaceLow | >85% usage | Warning |

## Security

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: lms
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

### Pod Security

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
  seccompProfile:
    type: RuntimeDefault
```

### TLS Configuration

```yaml
# Ingress TLS
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: api-gateway-tls
```

## Backup and Disaster Recovery

### Database Backups

```bash
# Automated daily backups
aws rds create-db-snapshot \
  --db-instance-identifier lms-postgres \
  --db-snapshot-identifier lms-backup-$(date +%Y%m%d)

# Point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier lms-postgres \
  --target-db-instance-identifier lms-postgres-restore \
  --restore-time 2024-01-01T00:00:00Z
```

### Disaster Recovery Plan

1. **RPO (Recovery Point Objective)**: 1 hour
2. **RTO (Recovery Time Objective)**: 4 hours
3. **Backup Retention**: 30 days
4. **Cross-region replication**: Enabled

## Troubleshooting

### Common Issues

#### Pod Stuck in Pending

```bash
# Check events
kubectl describe pod <pod-name> -n lms

# Check resource quotas
kubectl get resourcequota -n lms

# Check node resources
kubectl top nodes
```

#### Database Connection Issues

```bash
# Test connection from pod
kubectl exec -it <pod-name> -n lms -- nc -zv postgres 5432

# Check connection pool
kubectl logs <pod-name> -n lms | grep -i "connection"
```

#### High Memory Usage

```bash
# Check memory usage
kubectl top pods -n lms

# Check for memory leaks
kubectl logs <pod-name> -n lms | grep -i "heap"

# Restart service
kubectl rollout restart deployment/<service> -n lms
```

### Debug Commands

```bash
# Shell into pod
kubectl exec -it <pod-name> -n lms -- /bin/sh

# View environment variables
kubectl exec <pod-name> -n lms -- env

# Port forward for local testing
kubectl port-forward svc/<service> <local-port>:<service-port> -n lms

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

## Maintenance

### Rolling Updates

```bash
# Update image
kubectl set image deployment/api-gateway \
  api-gateway=lms/api-gateway:v1.1.0 -n lms

# Monitor rollout
kubectl rollout status deployment/api-gateway -n lms

# Rollback if needed
kubectl rollout undo deployment/api-gateway -n lms
```

### Certificate Renewal

```bash
# Check certificate expiration
kubectl get certificate -n lms

# Renew certificates
kubectl cert-manager renew -n lms --all
```

## Cost Optimization

### Resource Right-Sizing

1. Monitor actual usage with Prometheus/Grafana
2. Adjust requests/limits based on p95 usage
3. Use spot instances for non-critical workloads
4. Implement cluster autoscaling

### Database Optimization

1. Use read replicas for read-heavy workloads
2. Implement connection pooling (PgBouncer)
3. Archive old data
4. Use reserved instances for steady workloads

## Support and Escalation

### On-Call Rotation

| Severity | Response Time | Resolution Time |
|----------|---------------|-----------------|
| P1 (Critical) | 15 minutes | 4 hours |
| P2 (High) | 1 hour | 8 hours |
| P3 (Medium) | 4 hours | 24 hours |
| P4 (Low) | 24 hours | 72 hours |

### Escalation Path

1. L1 Support → Initial triage
2. L2 Engineering → Technical investigation
3. L3 Architecture → Complex issues
4. Management → Business impact decisions
