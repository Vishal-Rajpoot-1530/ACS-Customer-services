# Production Readiness Checklist: ACS Customer Service Centre Backend

## 1. Security Checklist
- [x] Passwords hashed using `bcrypt` (work factor >= 10).
- [x] JWT access tokens are short-lived (15 minutes).
- [x] Refresh tokens are cryptographically random, hashed in database, and rotated on use.
- [x] Role-based access control enforces `USER` vs `ADMIN` isolation.
- [x] Helmet security headers configured (HSTS, CSP, X-Frame-Options, etc.).
- [x] CORS restricted to `https://acs-customer-service-centre-1.vercel.app` in production.
- [x] Express rate limiting active on global, auth, and upload endpoints.
- [x] Centralized error handler masks stack traces in production (`NODE_ENV=production`).
- [x] Request ID assigned to every request and propagated in headers/logs.
- [x] No credentials or secrets committed to source control (`.gitignore` updated).

---

## 2. AWS S3 & Storage Checklist
- [x] S3 Bucket has **Block All Public Access** enabled.
- [x] S3 Default Encryption set to SSE-S3.
- [x] Documents never stored permanently on the server disk; uploaded directly to S3.
- [x] S3 Object keys use unique UUID prefixes: `documents/{userId}/{YYYY}/{MM}/{uuid}-{name}`.
- [x] Document downloads use short-lived (300s) presigned URLs.
- [x] File uploads verified for extension, MIME type, and magic bytes.
- [x] File size limit enforced (25 MB max).
- [x] Least-privilege IAM policy configured for S3 access.

---

## 3. Database Checklist
- [x] MongoDB connection uses TLS and connection pooling.
- [x] Indexes created on all high-frequency query fields (`email`, `userId`, `status`, `createdAt`).
- [x] Compound index `{ userId: 1, createdAt: -1 }` for customer listings.
- [x] Compound index `{ status: 1, createdAt: -1 }` for admin queue filtering.
- [x] Text index on `originalName`, `importedBy`, and `userEmail` for search.
- [x] TTL index on refresh token `expiresAt` for automated expired session cleanup.

---

## 4. Code Quality & Operations Checklist
- [x] Strict TypeScript configuration (`noImplicitAny`, `strictNullChecks`).
- [x] Zod validation for body, params, and query schemas.
- [x] Winston structured logging with log level based on environment.
- [x] Sensitive parameters (passwords, tokens, AWS keys) filtered from logs.
- [x] Health check endpoints (`/health` and `/health/ready`) implemented.
- [x] Graceful shutdown handling `SIGINT` and `SIGTERM` signals.
- [x] Automated test suite covering auth, uploads, signed URLs, and admin controls.
- [x] Dockerfile and Docker Compose provided for containerized environments.
