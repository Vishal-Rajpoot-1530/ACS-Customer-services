# Database Schema & Indexing Strategy: ACS Customer Service Centre

## 1. Overview
The database layer is implemented using **MongoDB** with **Mongoose**. All collections utilize strict schemas, automated timestamps (`createdAt`, `updatedAt`), validation rules, and specialized indexes optimized for high-performance querying and sorting.

---

## 2. Collections & Schema Definitions

### 2.1 `User` Collection (`users`)

Stores customer accounts and staff administrators.

```typescript
{
  _id: ObjectId,
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: false }, // Optional for OAuth/demo users
  displayName: { type: String, required: true, trim: true },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER', required: true },
  photoURL: { type: String, default: '' },
  isEmailVerified: { type: Boolean, default: false },
  googleId: { type: String, sparse: true },
  lastLogin: { type: Date, default: Date.now },
  passwordResetTokenHash: { type: String, default: null },
  passwordResetExpiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

#### Indexes:
- `email`: Unique index for authentication lookup (`{ email: 1 }`, unique).
- `googleId`: Sparse index for OAuth lookups (`{ googleId: 1 }`, sparse).
- `role`: Index for role-based administrative queries (`{ role: 1 }`).

---

### 2.2 `Document` Collection (`documents`)

Stores metadata and S3 object references for all uploaded customer service documents.

```typescript
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', required: true, index: true },
  originalName: { type: String, required: true, trim: true },
  storedName: { type: String, required: true },
  s3Bucket: { type: String, required: true },
  s3Key: { type: String, required: true, unique: true },
  mimeType: { type: String, required: true },
  extension: { type: String, required: true, lowercase: true },
  size: { type: Number, required: true }, // Size in bytes
  status: {
    type: String,
    enum: ['ready', 'pending', 'processing', 'completed'],
    default: 'ready',
    required: true,
    index: true
  },
  category: { type: String, default: 'Print Job', index: true },
  notes: { type: String, default: '' },
  importedBy: { type: String, required: true },
  userEmail: { type: String, required: true, lowercase: true },
  importedAt: { type: String, required: true }, // e.g. "07:20 PM"
  printOptions: {
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    colorMode: { type: String, enum: ['color', 'grayscale', 'bw'], default: 'color' },
    paperSize: { type: String, enum: ['A4', 'A3', 'Letter', 'Legal'], default: 'A4' },
    copies: { type: Number, default: 1, min: 1 }
  },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
}
```

#### Indexes & Compound Indexes:
- `{ userId: 1, createdAt: -1 }`: Optimizes customer dashboard listing and pagination sorted by newest first.
- `{ status: 1, createdAt: -1 }`: Optimizes admin queue filtering by status.
- `{ category: 1, createdAt: -1 }`: Optimizes queue filtering by category.
- `{ originalName: 'text', importedBy: 'text', userEmail: 'text' }`: Text search index for global search across customer names, emails, and document titles.
- `{ s3Key: 1 }`: Unique index to prevent collision of S3 object keys.

---

### 2.3 `RefreshToken` Collection (`refresh_tokens`)

Stores hashed refresh tokens supporting token rotation, fingerprinting, and remote revocation.

```typescript
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  replacedByTokenHash: { type: String, default: null },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}
```

#### Indexes:
- `{ tokenHash: 1 }`: Unique index for instant token verification and lookup.
- `{ userId: 1 }`: Index to locate all sessions belonging to a user (e.g. for "logout from all devices").
- `{ expiresAt: 1 }`: TTL index (`expireAfterSeconds: 0`) to automatically purge expired tokens from MongoDB.

---

### 2.4 `ContactInquiry` Collection (`contact_inquiries`)

Stores inquiries submitted from the frontend footer contact form.

```typescript
{
  _id: ObjectId,
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  message: { type: String, required: true, trim: true },
  status: { type: String, enum: ['new', 'in_progress', 'responded'], default: 'new' },
  createdAt: { type: Date, default: Date.now, index: true }
}
```

#### Indexes:
- `{ createdAt: -1 }`: Optimizes listing recent inquiries for administrative followup.
