# AWS S3 Configuration & Security Guide: ACS Customer Service Centre

## 1. Bucket Creation & General Configuration

- **Bucket Name:** `acs-customer-documents-prod` (must be globally unique)
- **AWS Region:** `ap-south-1` (Mumbai) or your chosen production region
- **Object Ownership:** ACLs disabled (Bucket owner enforced - recommended by AWS)

---

## 2. Public Access Settings (Mandatory)

Under **Block Public Access (bucket settings)**, ALL four toggles MUST be enabled:
- [x] Block public access to buckets and objects granted through *new* access control lists (ACLs)
- [x] Block public access to buckets and objects granted through *any* access control lists (ACLs)
- [x] Block public access to buckets and objects granted through *new* public bucket or access point policies
- [x] Block public and cross-account access to buckets and objects through *any* public bucket or access point policies

> [!CAUTION]
> Never make the S3 bucket public. Documents contain sensitive customer information. All access must flow through temporary presigned URLs signed by the backend.

---

## 3. Server-Side Encryption

- **Default Encryption:** Enabled
- **Encryption Type:** Server-side encryption with Amazon S3 managed keys (SSE-S3) or AWS KMS (SSE-KMS).
- **Bucket Key:** Enabled (reduces KMS request costs if using KMS).

---

## 4. Cross-Origin Resource Sharing (CORS) Configuration

To allow browser download triggers and preview in iframes or images from the frontend domain, configure CORS on the bucket:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedOrigins": [
      "https://acs-customer-service-centre-1.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Disposition",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 5. Object Key Hierarchy

Objects are organized hierarchically to distribute I/O operations and simplify lifecycle management:

```
documents/
  └── {userId}/
      └── {YYYY}/
          └── {MM}/
              └── {uuidv4}-{sanitizedOriginalFilename}
```

Example:
`documents/66d84f.../2026/09/b3f8a02c-ad14-4c8d-8fb4-e59e1201d4a1-aadhaar_card.pdf`

---

## 6. S3 Lifecycle Rules (Optional Cost Optimization)

Create a lifecycle rule:
- **Transition to Standard-Infrequent Access (IA):** After 90 days.
- **Expiration / Deletion of Incomplete Multipart Uploads:** After 7 days.
