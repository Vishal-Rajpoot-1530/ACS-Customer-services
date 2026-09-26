# System Architecture: ACS Customer Service Centre Backend

## 1. High-Level Architecture Overview

The ACS Customer Service Centre backend is built on an enterprise 3-tier, decoupled, event-driven architecture designed for high throughput, data integrity, and uncompromising security.

```
+----------------------------------------------------------------------------------------------------+
|                                    Client Layer (React / Vite SPA)                                 |
|                         https://acs-customer-service-centre-1.vercel.app                          |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  | HTTPS / REST (JSON + Multipart)
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                  Edge / Reverse Proxy Layer (Nginx)                                |
|                                Let's Encrypt SSL, Rate Limiting, Gzip                              |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  | Proxy Pass
                                                  v
+----------------------------------------------------------------------------------------------------+
|                               Node.js / Express Application Server                                 |
|                                                                                                    |
|  [Security & Observability Layer]                                                                  |
|  - Helmet (CSP, HSTS)                                                                              |
|  - CORS (Strict Origin Guarding)                                                                   |
|  - Request ID Tracing (X-Request-Id)                                                               |
|  - Winston Structured Logger                                                                       |
|  - Express Rate Limiter                                                                            |
|                                                                                                    |
|  [Routing & Controller Layer]                                                                      |
|  - /api/v1/auth          - /api/v1/users                                                           |
|  - /api/v1/documents     - /api/v1/admin                                                           |
|  - /api/v1/contact       - /health                                                                 |
|                                                                                                    |
|  [Middleware & Guard Layer]                                                                        |
|  - authenticate (JWT Access Verification)                                                          |
|  - authorize ('USER' | 'ADMIN')                                                                    |
|  - validate (Zod DTO Schema Engine)                                                                |
|  - upload (Multer Memory + Magic-Byte Security Validator)                                          |
|                                                                                                    |
|  [Business Logic Services Layer]                                                                   |
|  - AuthService           - DocumentService                                                         |
|  - S3Service             - ContactService                                                          |
|                                                                                                    |
|  [Data Access Repositories Layer]                                                                  |
|  - UserRepository        - DocumentRepository                                                      |
|  - RefreshTokenRepository                                                                          |
+----------------------------------------------------------------------------------------------------+
                  |                                                                 |
                  | Mongoose ODM (TLS)                                              | AWS SDK v3 (IAM / SigV4)
                  v                                                                 v
+-----------------------------------+             +--------------------------------------------------+
|          MongoDB Atlas            |             |               Private AWS S3 Bucket              |
|  - Users                          |             |  - Block Public Access: ENABLED                  |
|  - Documents (Metadata only)      |             |  - Server-Side Encryption: SSE-S3                |
|  - RefreshTokens (TTL Index)      |             |  - Key: documents/{userId}/{year}/{month}/{uuid} |
|  - ContactInquiries               |             |  - Direct signed download URL generation         |
+-----------------------------------+             +--------------------------------------------------+
```

---

## 2. Document Upload Data Flow

```
User uploads file on Frontend
        │
        ▼
POST /api/v1/documents (multipart/form-data)
        │
        ├── 1. Request ID assigned (X-Request-Id)
        ├── 2. Rate limiter verification
        ├── 3. JWT Authentication & User verification
        ├── 4. Multer memory buffer ingestion (25 MB max limit)
        ├── 5. File signature / Magic-byte & MIME type validation
        │
        ├── 6. File Streaming to AWS S3 (PutObjectCommand with SSE-S3)
        │      Bucket: acs-customer-documents-prod
        │      Key: documents/{userId}/{YYYY}/{MM}/{uuid}-{sanitizedName}
        │
        ├── 7. MongoDB Document Creation (Mongoose)
        │      Stores metadata, s3Bucket, s3Key, user references
        │
        ▼
201 Created Response with Document ID & details
```

---

## 3. Secure Document Download / Preview Flow

To eliminate server bottlenecks and network bandwidth exhaustion, the backend **never proxies large files** directly through Node.js. Instead, it leverages AWS S3 Presigned URLs:

```
User clicks Download or View
        │
        ▼
GET /api/v1/documents/:id/download
        │
        ├── 1. JWT Authentication
        ├── 2. Ownership / Admin Authorization check
        ├── 3. Fetch Document metadata from MongoDB
        ├── 4. Generate S3 GetObject Presigned URL
        │      - Valid for 300 seconds (5 minutes)
        │      - Sets Content-Disposition header with original file name
        │
        ▼
200 OK Response:
{
  "success": true,
  "data": {
    "url": "https://acs-customer-documents-prod.s3.ap-south-1.amazonaws.com/documents/...?AWSAccessKeyId=...",
    "expiresIn": 300
  }
}
        │
        ▼
Frontend triggers download or renders in Document Viewer modal directly from S3
```

---

## 4. Key Design Patterns Applied

1. **Separation of Concerns:** Strict isolation between HTTP handling (Controllers), Business Logic (Services), and Database Querying (Repositories).
2. **Fail-Fast Configuration:** Centralized environment schema validated via Zod at application bootstrap. If any critical variable is missing, the process exits with an informative error.
3. **Repository Pattern:** Allows clean data querying, decoupling Mongoose implementation details from domain services.
4. **Centralized Error Handling:** All operational exceptions subclass `AppError`. Central error middleware intercepts, sanitizes, and renders clean JSON responses without leaking internal stack traces.
5. **Least-Privilege AWS Access:** Dedicated IAM role with actions restricted strictly to the designated S3 bucket.
