# Security Architecture & Hardening Guide: ACS Customer Service Centre

## 1. Threat Model & Security Controls

| Threat Vector | Potential Impact | Security Control Implemented |
| :--- | :--- | :--- |
| **Malicious File Upload** | Remote code execution, XSS, server takeover | Memory storage, file extension validation, MIME type verification, magic-byte / signature checking, UUID object names in private S3 bucket. |
| **Unauthorized Document Access** | Customer privacy breach, data leakage | Private S3 bucket (Block Public Access ON), no permanent public URLs, JWT role & ownership verification before generating 300s presigned URLs. |
| **Token Theft / Session Hijacking** | Account impersonation | Short-lived access tokens (15m), hashed refresh tokens in MongoDB, token rotation on every refresh, remote revocation mechanism. |
| **Brute-Force & Denial of Service** | Resource exhaustion, password cracking | Express rate limiters on auth (5 requests / 15 min) and global API (100 req / min), body size limits (30 MB max). |
| **Data in Transit Interception** | Man-in-the-Middle (MITM) attacks | Mandatory TLS/HTTPS, HSTS headers via Helmet, secure signed AWS SigV4 requests. |
| **Cross-Origin Resource Abuse** | CSRF / Unauthorized API invocation | Dynamic CORS restricted strictly to `FRONTEND_URL` (`https://acs-customer-service-centre-1.vercel.app`). Wildcards (`*`) forbidden in production. |
| **Information Disclosure** | Internal stack trace leaks | Centralized error handler masks stack traces and internal errors in production, returning sanitized error codes. |

---

## 2. Magic-Byte Validation

To prevent extension spoofing (e.g. renaming `malicious.exe` to `invoice.pdf`), the backend inspects the first 4-8 bytes of every uploaded file:

| Type | Valid Extensions | Magic Bytes (Hex) |
| :--- | :--- | :--- |
| **PDF** | `.pdf` | `25 50 44 46` (`%PDF`) |
| **PNG** | `.png` | `89 50 4E 47 0D 0A 1A 0A` |
| **JPEG** | `.jpg`, `.jpeg` | `FF D8 FF` |
| **WEBP** | `.webp` | `52 49 46 46 ... 57 45 42 50` (`RIFF....WEBP`) |
| **ZIP-based Office (DOCX, XLSX)** | `.docx`, `.xlsx` | `50 4B 03 04` (`PK..`) |
| **Plain Text / CSV** | `.txt`, `.csv` | Valid UTF-8 printable character range |

---

## 3. Rate Limiting Policy

- **Global Limiter:** 100 requests per 15-minute window per IP.
- **Authentication Limiter:** 10 attempts per 15-minute window per IP (`/api/v1/auth/login`, `/api/v1/auth/register`).
- **Upload Limiter:** 30 file uploads per 15-minute window per IP.

---

## 4. Helmet Security Headers

- `Content-Security-Policy`: Restricts scripts and framing.
- `Strict-Transport-Security`: `max-age=31536000; includeSubDomains; preload`.
- `X-Content-Type-Options`: `nosniff`.
- `X-Frame-Options`: `SAMEORIGIN`.
- `Referrer-Policy`: `strict-origin-when-cross-origin`.
