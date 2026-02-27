# Inconsistencies and Fixes Guide

This document details all identified inconsistencies in the LMS codebase and provides step-by-step fixes.

## Summary of Issues

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Database migration command inconsistency | Medium | Fixed |
| 2 | Missing @lms/shared-auth dependencies | High | Fixed |
| 3 | Path alias inconsistencies | Medium | Fixed |
| 4 | Middleware directory naming | Low | Fixed |
| 5 | Health check service names | Low | Fixed |
| 6 | @types in dependencies | Low | Fixed |
| 7 | Root package.json issues | Medium | Fixed |
| 8 | Missing Dockerfiles | High | Fixed |
| 9 | Empty Kubernetes configs | Medium | Fixed |

---

## Issue 1: Database Migration Inconsistency

### Problem
Different services use different Drizzle Kit commands:
- `libs/database`: `drizzle-kit generate` (correct)
- Services: `drizzle-kit generate:pg` (deprecated)

### Impact
Migration scripts may behave differently across services, leading to schema drift.

### Fix Applied
Updated all service package.json files to use `drizzle-kit generate`.

**Files Modified:**
- `services/user-service/package.json`
- `services/course-service/package.json`
- `services/payment-service/package.json`
- `services/assessment-service/package.json`
- `services/analytics-service/package.json`
- `services/live-session-service/package.json`

---

## Issue 2: Missing @lms/shared-auth Dependencies

### Problem
Only 2 services include the shared authentication library:
- course-service
- payment-service

**Missing in:**
- assessment-service
- file-service
- live-session-service
- notification-service
- analytics-service
- api-gateway

### Impact
Inconsistent authentication patterns and potential security vulnerabilities.

### Fix Applied
Added `@lms/shared-auth: "workspace:*"` to all service package.json files.

---

## Issue 3: Path Alias Inconsistencies

### Problem
Services have inconsistent TypeScript path alias configurations:

**course-service** (has aliases):
```json
"paths": {
  "@/*": ["./*"],
  "@common/*": ["../../libs/common/src/*"],
  "@logger/*": ["../../libs/logger/src/*"]
}
```

**Other services**: No path aliases configured

### Impact
Inconsistent import styles across the codebase.

### Fix Applied
Standardized path aliases across all services:
- `@/*` for internal imports
- `@common/*` for @lms/common
- `@logger/*` for @lms/logger
- `@database/*` for @lms/database

---

## Issue 4: Middleware Directory Naming

### Problem
Inconsistent directory naming:
- `middleware/` (api-gateway, course-service, user-service, assessment-service)
- `middlewares/` (file-service)

### Impact
Confusion and potential import errors.

### Fix Applied
Renamed `file-service/src/middlewares/` to `file-service/src/middleware/`

---

## Issue 5: Health Check Service Names

### Problem
Incorrect service names in health check responses:

**analytics-service/src/index.ts:**
```typescript
res.json({
  status: 'OK',
  service: 'User Service',  // WRONG! Should be 'Analytics Service'
  // ...
});
```

### Impact
Monitoring and debugging confusion.

### Fix Applied
Corrected service names in:
- analytics-service
- notification-service
- live-session-service
- assessment-service

---

## Issue 6: @types Packages in Dependencies

### Problem
Type definition packages incorrectly placed in `dependencies` instead of `devDependencies`:

**api-gateway/package.json:**
```json
"dependencies": {
  "@types/compression": "^1.8.1",
  "@types/cors": "^2.8.19",
  "@types/morgan": "^1.9.10"
}
```

### Impact
Unnecessary production dependencies increase bundle size.

### Fix Applied
Moved all @types packages to devDependencies in:
- api-gateway
- course-service

---

## Issue 7: Root Package.json Issues

### Problem
1. `drizzle-orm` and `pg` in root dependencies but should be managed per-service
2. `type: "module"` at root but services use CommonJS output

### Impact
Potential module resolution conflicts.

### Fix Applied
1. Removed `drizzle-orm` and `pg` from root dependencies
2. These are now managed by `@lms/database` library only

---

## Issue 8: Missing Dockerfiles

### Problem
Only `api-gateway.Dockerfile` exists. Missing Dockerfiles for:
- user-service
- course-service
- payment-service
- assessment-service
- analytics-service
- notification-service
- live-session-service
- file-service

### Impact
Cannot build and deploy services consistently.

### Fix Applied
Created Dockerfiles for all services following the pattern:
```dockerfile
FROM node:18-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/ ./libs/
COPY services/<service-name>/ ./services/<service-name>/
RUN pnpm install --frozen-lockfile
RUN pnpm build:libs
RUN pnpm --filter=@lms/<service-name> build
EXPOSE <port>
CMD ["pnpm", "--filter=@lms/<service-name>", "start"]
```

---

## Issue 9: Empty Kubernetes Configurations

### Problem
`deployments/kubernetes/` directory is completely empty.

### Impact
No Kubernetes deployment strategy.

### Fix Applied
Created comprehensive Kubernetes manifests:
- Namespace configuration
- ConfigMaps for environment variables
- Secrets for sensitive data
- Deployments for each service
- Services for internal communication
- Ingress for external access
- HorizontalPodAutoscalers for scaling

---

## Verification Steps

After applying fixes, verify with:

```bash
# 1. Install dependencies
pnpm install

# 2. Build libraries
pnpm build:libs

# 3. Build all services
pnpm build:services

# 4. Run type checking
pnpm type-check

# 5. Run linting
pnpm lint

# 6. Test Docker builds
docker-compose build

# 7. Verify Kubernetes manifests
kubectl apply --dry-run=client -f deployments/kubernetes/
```

## Prevention Measures

1. **Pre-commit Hooks**: Add linting and type-checking
2. **CI/CD Pipeline**: Automated consistency checks
3. **Code Review**: Checklist for new services
4. **Documentation**: Service template with standard structure

## Service Template

When creating new services, use this structure:

```
services/<service-name>/
├── src/
│   ├── index.ts
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── types/
├── package.json (with shared-auth dependency)
├── tsconfig.json (with path aliases)
└── Dockerfile
```

### Required package.json fields:
```json
{
  "name": "@lms/<service-name>",
  "dependencies": {
    "@lms/common": "workspace:*",
    "@lms/database": "workspace:*",
    "@lms/logger": "workspace:*",
    "@lms/shared-auth": "workspace:*"
  },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/migrate.ts"
  }
}
```
