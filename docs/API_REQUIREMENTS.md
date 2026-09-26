# API Requirements & Specification: ACS Customer Service Centre

## 1. Overview

- **Base URL:** `/api/v1`
- **Protocol:** HTTPS (HTTP for local development)
- **Response Format:** JSON
- **Authentication:** Bearer JWT in the `Authorization: Bearer <token>` header (or HTTP-only cookie).
- **Default Content Type:** `application/json` (`multipart/form-data` for file uploads).

---

## 2. Standard Response Format

### Success Response Envelope
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "message": "Human readable error message",
  "error": {
    "code": "ERROR_CODE_ENUM",
    "details": []
  }
}
```

---

## 3. Authentication Endpoints (`/api/v1/auth`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/register` | `POST` | Public | Register a new customer account. |
| `/api/v1/auth/login` | `POST` | Public | Authenticate with email & password. Returns access & refresh tokens. |
| `/api/v1/auth/refresh` | `POST` | Public | Exchange valid refresh token for a new access & refresh token pair. |
| `/api/v1/auth/logout` | `POST` | Authenticated | Revoke refresh token and invalidate session. |
| `/api/v1/auth/me` | `GET` | Authenticated | Fetch current authenticated user profile. |
| `/api/v1/auth/change-password` | `POST` | Authenticated | Update user password. |
| `/api/v1/auth/forgot-password` | `POST` | Public | Initiate password reset process. |
| `/api/v1/auth/reset-password` | `POST` | Public | Reset password using reset token. |

---

## 4. User Profile Endpoints (`/api/v1/users`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/users/profile` | `PATCH` | Authenticated | Update current user's profile information (displayName, photoURL). |

---

## 5. Document Management Endpoints (`/api/v1/documents`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/documents` | `POST` | Authenticated / Public Guest | Upload a new document with multipart file & metadata. |
| `/api/v1/documents` | `GET` | Authenticated | List user's documents with pagination, status filter, and search. |
| `/api/v1/documents/:id` | `GET` | Authenticated | Get metadata for a specific document. |
| `/api/v1/documents/:id/download` | `GET` | Authenticated | Generate a short-lived (300s) presigned S3 download/view URL. |
| `/api/v1/documents/:id` | `DELETE` | Authenticated | Delete document from S3 and MongoDB. |

---

## 6. Admin Desk Endpoints (`/api/v1/admin`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/admin/documents` | `GET` | Admin Only | Get all documents across all users with status, category, search, and pagination. |
| `/api/v1/admin/documents/:id` | `PUT` | Admin Only | Update document details (name, category, status, notes). |
| `/api/v1/admin/documents/:id/status`| `PATCH`| Admin Only | Toggle status between `ready`, `processing`, and `completed`. |
| `/api/v1/admin/documents/:id` | `DELETE` | Admin Only | Permanently delete any document record and its S3 object. |
| `/api/v1/admin/stats` | `GET` | Admin Only | Get queue analytics (total, ready, processing, completed, customer count). |

---

## 7. Contact & Inquiry Endpoints (`/api/v1/contact`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/contact` | `POST` | Public | Submit customer service inquiry from the footer form. |
| `/api/v1/contact` | `GET` | Admin Only | List customer inquiries with pagination and status filter. |

---

## 8. Health & Readiness Endpoints

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | Public | Basic service liveness check. |
| `/health/ready` | `GET` | Public | Service readiness check (verifies MongoDB and S3 connectivity). |

---

## 9. Error Codes Specification

| Code | HTTP Status | Meaning |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | 400 | Invalid request body, query parameter, or file schema. |
| `INVALID_FILE_TYPE` | 400 | File type not supported or failed magic number check. |
| `FILE_TOO_LARGE` | 400 | File exceeds 25 MB limit. |
| `UNAUTHORIZED` | 401 | Missing, expired, or invalid JWT token. |
| `FORBIDDEN` | 403 | User does not have permission to access the resource. |
| `NOT_FOUND` | 404 | Target resource (document, user, inquiry) does not exist. |
| `CONFLICT` | 409 | Resource conflict (e.g. email already registered). |
| `RATE_LIMIT_EXCEEDED`| 429 | Too many requests sent within the rate window. |
| `S3_ERROR` | 500 | AWS S3 communication or storage failure. |
| `INTERNAL_SERVER_ERROR`| 500 | Unhandled internal exception. |
