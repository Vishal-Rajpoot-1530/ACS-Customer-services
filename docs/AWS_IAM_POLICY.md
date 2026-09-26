# AWS IAM Security & Least Privilege Policy

## 1. Overview
The backend application requires access to AWS S3 to upload files, generate presigned download URLs, verify object existence, and delete documents. 

In accordance with AWS security best practices, **never use root credentials** or attach `AdministratorAccess` or `AmazonS3FullAccess`.

---

## 2. Dedicated IAM User / Role

- **IAM Role / User Name:** `acs-customer-service-backend-app`
- **When running on AWS EC2 / ECS:** Attach an IAM Role directly to the EC2 instance profile or ECS task definition (no access keys stored on disk).
- **When running outside AWS (Local / On-prem):** Use IAM User access keys stored securely in `.env` (never committed to git).

---

## 3. Least Privilege IAM Policy

Attach the following policy to the IAM role or user:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ACSBackendS3BucketList",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::acs-customer-documents-prod"
    },
    {
      "Sid": "ACSBackendS3ObjectOperations",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:GetObjectTagging",
        "s3:PutObjectTagging"
      ],
      "Resource": "arn:aws:s3:::acs-customer-documents-prod/*"
    }
  ]
}
```

---

## 4. Policy Explanation

- `s3:ListBucket`: Allows the application to verify bucket existence and inspect prefixes if necessary.
- `s3:PutObject`: Allows uploading document buffers to S3 with SSE-S3 encryption.
- `s3:GetObject`: Necessary for generating presigned GET URLs using AWS SDK v3's `getSignedUrl`.
- `s3:DeleteObject`: Allows deleting files when a user or administrator permanently removes a document.
- **Resource restriction:** Permissions apply **only** to `acs-customer-documents-prod` and its sub-keys (`/*`), completely isolating other AWS assets.
