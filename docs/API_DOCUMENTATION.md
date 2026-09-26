# API Documentation: ACS Customer Service Centre

## Base URL
`/api/v1`

---

## 1. Authentication Endpoints

### 1.1 Register Customer
- **Method:** `POST`
- **Route:** `/api/v1/auth/register`
- **Public**
- **Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "Password123!",
  "displayName": "Rahul Sharma",
  "photoURL": "https://example.com/avatar.jpg"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "66d84f...",
      "email": "customer@example.com",
      "displayName": "Rahul Sharma",
      "role": "USER",
      "photoURL": "https://example.com/avatar.jpg"
    },
    "tokens": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "7c1b4..."
    }
  }
}
```

### 1.2 Login
- **Method:** `POST`
- **Route:** `/api/v1/auth/login`
- **Public**
- **Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "Password123!"
}
```
- **Response (200 OK):** Same structure as Register.

### 1.3 Refresh Token
- **Method:** `POST`
- **Route:** `/api/v1/auth/refresh`
- **Public**
- **Request Body:**
```json
{
  "refreshToken": "7c1b4..."
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "9a2f1..."
  }
}
```

### 1.5 Current User Profile
- **Method:** `GET`
- **Route:** `/api/v1/auth/me`
- **Header:** `Authorization: Bearer <accessToken>`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "66d84f...",
      "email": "customer@example.com",
      "displayName": "Rahul Sharma",
      "role": "USER"
    }
  }
}
```

### 1.6 Logout
- **Method:** `POST`
- **Route:** `/api/v1/auth/logout`
- **Header:** `Authorization: Bearer <accessToken>`
- **Request Body:**
```json
{
  "refreshToken": "7c1b4..."
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 2. Document Management Endpoints

### 2.1 Upload Document
- **Method:** `POST`
- **Route:** `/api/v1/documents`
- **Header:** `Authorization: Bearer <accessToken>` (Optional for guest upload)
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `file`: Binary file (PDF, Word, Excel, Image, Text up to 25 MB)
  - `category`: String (default `"Print Job"`)
  - `notes`: String (optional)
  - `importedBy`: String (optional, defaults to user's name)
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "document": {
      "id": "66d85a...",
      "name": "Project_Proposal.pdf",
      "size": 1048576,
      "mimeType": "application/pdf",
      "status": "ready",
      "category": "Print Job",
      "importedBy": "Rahul Sharma",
      "userEmail": "customer@example.com",
      "importedAt": "07:20 PM",
      "createdAt": "2026-09-04T13:50:00.000Z"
    }
  }
}
```

### 2.2 List User Documents
- **Method:** `GET`
- **Route:** `/api/v1/documents?status=ready&search=proposal&page=1&limit=20`
- **Header:** `Authorization: Bearer <accessToken>`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [ /* array of document metadata objects */ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 2.3 Get Document Download URL
- **Method:** `GET`
- **Route:** `/api/v1/documents/:id/download`
- **Header:** `Authorization: Bearer <accessToken>`
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Presigned URL generated successfully",
  "data": {
    "url": "https://acs-customer-documents-prod.s3.ap-south-1.amazonaws.com/...",
    "expiresIn": 300,
    "fileName": "Project_Proposal.pdf"
  }
}
```

### 2.4 Delete Document
- **Method:** `DELETE`
- **Route:** `/api/v1/documents/:id`
- **Header:** `Authorization: Bearer <accessToken>`
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

## 3. Admin Desk Endpoints

### 3.1 Get All Documents (Admin Queue)
- **Method:** `GET`
- **Route:** `/api/v1/admin/documents?status=all&search=sharma&page=1&limit=50`
- **Header:** `Authorization: Bearer <adminToken>`
- **Response (200 OK):** List of all documents with pagination.

### 3.2 Update Document Details
- **Method:** `PUT`
- **Route:** `/api/v1/admin/documents/:id`
- **Header:** `Authorization: Bearer <adminToken>`
- **Request Body:**
```json
{
  "name": "Updated_Proposal.pdf",
  "category": "Print Job",
  "status": "processing",
  "notes": "Color A4 print requested"
}
```

### 3.3 Update Document Status
- **Method:** `PATCH`
- **Route:** `/api/v1/admin/documents/:id/status`
- **Header:** `Authorization: Bearer <adminToken>`
- **Request Body:**
```json
{
  "status": "completed"
}
```

### 3.4 Admin Queue Analytics
- **Method:** `GET`
- **Route:** `/api/v1/admin/stats`
- **Header:** `Authorization: Bearer <adminToken>`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalDocuments": 150,
    "readyDocuments": 12,
    "processingDocuments": 5,
    "completedDocuments": 133,
    "totalCustomers": 85
  }
}
```

---

## 4. Contact & Inquiry Endpoints

### 4.1 Submit Inquiry
- **Method:** `POST`
- **Route:** `/api/v1/contact`
- **Public**
- **Request Body:**
```json
{
  "name": "Suresh Kumar",
  "mobile": "+919876543210",
  "email": "suresh@example.com",
  "message": "Need help with bulk passport application printing"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Inquiry submitted successfully"
}
```
