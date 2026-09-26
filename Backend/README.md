# ACS Customer Service Centre — Production Backend API

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x%20LTS-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![AWS SDK v3](https://img.shields.io/badge/AWS%20SDK-v3-orange.svg)](https://aws.amazon.com/sdk-for-javascript/)
[![MySQL](https://img.shields.io/badge/MySQL-8%2B-blue.svg)](https://www.mysql.com/)

A production-grade, secure, highly scalable Node.js/TypeScript backend engineered specifically for the [ACS Customer Service Centre Frontend](https://acs-customer-service-centre-1.vercel.app/).

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [Technology Stack](#3-technology-stack)
4. [Architecture & Data Flows](#4-architecture--data-flows)
5. [Project Directory Layout](#5-project-directory-layout)
6. [Environment Variables](#6-environment-variables)
7. [Local Development Setup](#7-local-development-setup)
8. [MySQL Configuration](#8-mysql-configuration)
9. [AWS S3 Configuration](#9-aws-s3-configuration)
10. [AWS IAM Least Privilege Policy](#10-aws-iam-least-privilege-policy)
11. [Running Tests](#11-running-tests)
12. [Production Build](#12-production-build)
13. [Docker & Docker Compose](#13-docker--docker-compose)
14. [API Documentation (Swagger UI)](#14-api-documentation-swagger-ui)
15. [AWS Production Deployment Runbook](#15-aws-production-deployment-runbook)
16. [Security Considerations](#16-security-considerations)
17. [Troubleshooting & FAQ](#17-troubleshooting--faq)

---

## 1. Project Overview

The ACS Customer Service Centre backend powers a digital customer desk and cyber cafe workflow. It enables customers to digitally upload documents (PDF, Word, Excel, Images, Text) for printing, scanning, and online service processing. Desk administrators track, process, and update jobs in real time via an administrative queue.

All uploaded documents are stored in **private AWS S3 buckets** with server-side encryption (SSE-S3). Documents are accessed exclusively via temporary, short-lived (300 seconds) presigned URLs, ensuring no permanent public access or server memory exhaustion.

---

## 2. Key Features

- **Authentication & Sessions:**
  - JWT authentication with 15-minute access tokens and 7-day refresh tokens.
  - Refresh token rotation with compromised-token reuse detection.
  - Password hashing with bcrypt (12 salt rounds).
  - Remote session invalidation on password change or logout.
- **Document Management & AWS S3:**
  - Direct file stream to AWS S3 using AWS SDK v3 (`@aws-sdk/client-s3`).
  - Filename sanitization, UUID prefixes, and directory partitioning: `documents/{userId}/{YYYY}/{MM}/{uuid}-{name}`.
  - Magic-byte / file signature validation to prevent disguised executables.
  - Temporary presigned download URLs (`@aws-sdk/s3-request-presigner`) with 5-minute expiration.
  - Complete document lifecycle (Upload, View metadata, Paginated listing, Status filter, Search, Download, Permanent delete).
- **Admin Desk Management:**
  - Live document queue with multi-field search (Customer name, email, document name).
  - Status toggle (`ready`, `processing`, `completed`, `pending`).
  - Document metadata editor (name, category, notes, print options).
  - Administrative statistics and queue analytics.
- **Enterprise Security & Observability:**
  - Strict CORS origin enforcement (`https://acs-customer-service-centre-1.vercel.app`).
  - Helmet HTTP security headers (CSP, HSTS, X-Frame-Options).
  - Multi-tier Express Rate Limiters (Global, Auth, and Upload).
  - Winston structured JSON logger with request tracing via `X-Request-Id`.
  - Centralized error handler masking internals and stack traces in production.

---

## 3. Technology Stack

- **Runtime:** Node.js (v20+ LTS recommended)
- **Language:** TypeScript 5.7 (Strict mode)
- **Framework:** Express 4.21
- **Database:** MySQL 8+ with mysql2
- **Cloud Storage:** AWS S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **Authentication:** `jsonwebtoken`, `bcrypt`
- **Validation:** Zod 3.24
- **File Upload:** Multer (Memory Storage)
- **Security:** Helmet, CORS, Express-Rate-Limit
- **Documentation:** Swagger UI Express, OpenAPI 3.0
- **Testing:** Jest, Supertest, ts-jest

---

## 4. Architecture & Data Flows

```
[ Frontend Client (Vercel) ]
             |
             | HTTPS (REST API)
             v
[ Nginx Reverse Proxy / Let's Encrypt SSL ]
             |
             | Proxy pass (Port 5000)
             v
[ Node.js / Express Server ]
     ├── Request ID + Rate Limiting + CORS + Helmet
     ├── Zod Validation Middleware
     ├── JWT Authentication & Role Authorization
     ├── Multer + Magic-Byte Security Validator
     │
     ├── Document Service ── PutObject ──► [ Private AWS S3 Bucket (SSE-S3) ]
     │                                     documents/{userId}/{YYYY}/{MM}/{uuid}
     │                                            │
     │        Presigned Download URL (300s)       │
     │◄───────────────────────────────────────────┘
     │
    └── Repositories ──► [ MySQL Database ]
                          ├── Users
                          ├── Documents (metadata only)
                          └── RefreshTokens
```

---

## 5. Project Directory Layout

```
Backend/
├── src/
│   ├── config/             # Environment, DB, S3, Logger configurations
│   ├── constants/          # Roles, status codes, document statuses
│   ├── controllers/        # HTTP route controllers
│   ├── docs/               # Swagger OpenAPI specifications
│   ├── middlewares/        # Auth, role, upload, rate limit, validation, error handler
│   ├── models/             # Database entity types
│   ├── repositories/       # Database query abstraction
│   ├── routes/             # REST route definitions
│   ├── services/           # Core business logic (Auth, S3, Document, Contact)
│   ├── types/              # TypeScript interfaces and declarations
│   ├── utils/              # AppError, response formatting, JWT, file security
│   ├── app.ts              # Express application assembly
│   └── server.ts           # Server bootstrap & graceful shutdown
├── tests/
│   ├── unit/               # Unit tests (JWT, S3, File security)
│   ├── integration/        # Integration tests (Health, Auth, Documents)
│   └── setup.ts            # Test environment configuration
├── dist/                   # Production compiled JavaScript
├── Dockerfile              # Multi-stage production container
├── docker-compose.yml      # Local dev backend + MySQL stack
├── package.json
└── tsconfig.json
```

---

## 6. Environment Variables

Create a `.env` file in the `Backend/` root directory:

```env
# Server
NODE_ENV=development
PORT=5000

# MySQL
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=acs_customer_service

# JWT Secrets (Generate strong 32+ character keys)
JWT_ACCESS_SECRET=your_super_secret_access_jwt_key_min_32_characters_long_12345
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_min_64_characters_long_abcde_12345
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3 Storage
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET_NAME=acs-customer-documents-prod
S3_SIGNED_URL_EXPIRES_IN=300

# CORS
FRONTEND_URL=https://acs-customer-service-centre-1.vercel.app

# Security
COOKIE_SECRET=random_secure_cookie_secret_key_12345
MAX_FILE_SIZE_MB=25
LOG_LEVEL=info
```

---

## 7. Local Development Setup

```bash
cd Backend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your local credentials

# 3. Start development server with auto-reloading
npm run dev
```

---

## 8. MySQL Configuration

- **Local:** Run `docker compose up -d mysql` from the `Backend/` directory.
- **Production:** Provision MySQL 8+ and set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE`.
- The backend creates its required tables automatically on startup.

---

## 9. AWS S3 Configuration

1. Create a bucket named `acs-customer-documents-prod`.
2. Enable **Block All Public Access**.
3. Enable Default Encryption (**SSE-S3**).
4. Configure CORS rules as documented in `docs/AWS_S3_SETUP.md`.

---

## 10. AWS IAM Least Privilege Policy

Attach the following policy to the IAM user or EC2 IAM Role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ACSBucketList",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::acs-customer-documents-prod"
    },
    {
      "Sid": "ACSObjectOperations",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::acs-customer-documents-prod/*"
    }
  ]
}
```

---

## 11. Running Tests

```bash
# Run unit & integration tests
npm run test

# Run tests in watch mode
npm run test:watch
```

---

## 12. Production Build

```bash
# Compile TypeScript to dist/
npm run build

# Start production server
npm run start
```

---

## 13. Docker & Docker Compose

```bash
# Start backend and MySQL together
docker-compose up --build -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

---

## 14. API Documentation (Swagger UI)

Interactive OpenAPI documentation is available at:
`http://localhost:5000/api/docs`

---

## 15. AWS Production Deployment Runbook

See detailed step-by-step instructions in [docs/AWS_DEPLOYMENT.md](file:///v:/Projects/ACS%20Customer%20services/docs/AWS_DEPLOYMENT.md).

Quick Summary:
1. Launch Ubuntu 22.04 LTS on AWS EC2 (`t3.small`).
2. Attach IAM Role with S3 policy.
3. Install Node.js 20, Nginx, PM2, and Certbot.
4. Clone repo, run `npm ci` and `npm run build`.
5. Start backend under PM2: `pm2 start dist/server.js --name "acs-backend" -i max`.
6. Configure Nginx reverse proxy and obtain SSL with `sudo certbot --nginx`.

---

## 16. Security Considerations

- **No Public Files:** Files in S3 are strictly private; URLs expire in 5 minutes.
- **No Path Traversal:** Filenames are sanitized and prepended with random UUIDs.
- **Magic-Byte Checking:** Extension spoofing is prevented by checking byte signatures.
- **Rate Limiting:** Protects authentication and upload endpoints against abuse.
- **Environment Isolation:** Secrets and keys are never committed to version control.

---

## 17. Troubleshooting & FAQ

| Issue | Resolution |
| :--- | :--- |
| `S3_UPLOAD_FAILED` | Verify AWS credentials, region, and IAM policy permissions for `s3:PutObject`. |
| `CORS_ERROR` | Ensure the request `Origin` header matches `FRONTEND_URL` in `.env`. |
| `FILE_TOO_LARGE` | Check `MAX_FILE_SIZE_MB` in `.env` (default is 25 MB). |
| `TOKEN_EXPIRED` | Refresh token using `POST /api/v1/auth/refresh`. |
