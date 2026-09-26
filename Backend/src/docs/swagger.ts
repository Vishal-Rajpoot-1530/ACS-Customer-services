import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'ACS Customer Service Centre API',
    version: '1.0.0',
    description:
      'Production-grade RESTful API for ACS Customer Service Centre document management, printing queue, and cyber desk portal. Use the Authorize button with your Bearer JWT token to test authenticated routes.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Root (All /api/v1 endpoints)',
    },
    {
      url: '/',
      description: 'Server Root (Health check endpoints)',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT access token. Format: Bearer <token>',
      },
    },
    schemas: {
      ErrorDetail: {
        type: 'object',
        properties: {
          path: { type: 'string', example: 'body.email' },
          message: { type: 'string', example: 'Invalid email address format' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'An error occurred while processing the request' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              details: {
                type: 'array',
                items: { $ref: '#/components/schemas/ErrorDetail' },
              },
              stack: { type: 'string', example: 'Error: Request validation failed...' },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '65e8a7f123456789abcdef01' },
          email: { type: 'string', example: 'customer@acs.com' },
          displayName: { type: 'string', example: 'John Doe' },
          role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
          photoURL: { type: 'string', example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb' },
          isEmailVerified: { type: 'boolean', example: false },
          lastLogin: { type: 'string', format: 'date-time', example: '2026-09-08T10:15:30.000Z' },
          createdAt: { type: 'string', format: 'date-time', example: '2026-09-08T09:00:00.000Z' },
          updatedAt: { type: 'string', format: 'date-time', example: '2026-09-08T10:15:30.000Z' },
        },
      },
      PrintOptions: {
        type: 'object',
        properties: {
          orientation: {
            type: 'string',
            enum: ['portrait', 'landscape'],
            default: 'portrait',
            example: 'portrait',
          },
          colorMode: {
            type: 'string',
            enum: ['color', 'grayscale', 'bw'],
            default: 'color',
            example: 'color',
          },
          paperSize: {
            type: 'string',
            enum: ['A4', 'A3', 'Letter', 'Legal'],
            default: 'A4',
            example: 'A4',
          },
          copies: {
            type: 'integer',
            minimum: 1,
            default: 1,
            example: 1,
          },
        },
      },
      Document: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '65e8b1c423456789abcdef99' },
          userId: { type: 'string', example: '65e8a7f123456789abcdef01' },
          originalName: { type: 'string', example: 'passport_scan.pdf' },
          storedName: { type: 'string', example: '1709900000000_doc.pdf' },
          s3Bucket: { type: 'string', example: 'acs-customer-service-docs' },
          s3Key: { type: 'string', example: 'documents/65e8a7f123456789abcdef01/1709900000000_passport_scan.pdf' },
          mimeType: { type: 'string', example: 'application/pdf' },
          extension: { type: 'string', example: 'pdf' },
          size: { type: 'integer', example: 1048576, description: 'File size in bytes' },
          status: {
            type: 'string',
            enum: ['ready', 'pending', 'processing', 'completed'],
            example: 'ready',
          },
          category: { type: 'string', example: 'Identity & Visa' },
          notes: { type: 'string', example: 'High quality print on photo paper' },
          importedBy: { type: 'string', example: 'John Doe' },
          userEmail: { type: 'string', example: 'customer@acs.com' },
          importedAt: { type: 'string', example: '2026-09-08T10:30:00.000Z' },
          printOptions: { $ref: '#/components/schemas/PrintOptions' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ContactInquiry: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '65e8c2d523456789abcdef88' },
          name: { type: 'string', example: 'Robert Johnson' },
          mobile: { type: 'string', example: '+919876543210' },
          email: { type: 'string', example: 'robert@example.com' },
          message: { type: 'string', example: 'Inquiry about bulk scanning and certificate printing services.' },
          status: { type: 'string', enum: ['new', 'in_progress', 'responded'], example: 'new' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 12 },
          totalPages: { type: 'integer', example: 1 },
        },
      },
      RegisterRequestBody: {
        type: 'object',
        required: ['email', 'password', 'displayName'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'customer@acs.com',
            description: 'Valid customer email address',
          },
          password: {
            type: 'string',
            minLength: 8,
            example: 'AcsCustomer2026!',
            description: 'Minimum 8 characters with at least 1 uppercase, 1 lowercase, and 1 digit',
          },
          displayName: {
            type: 'string',
            minLength: 2,
            example: 'John Doe',
            description: 'Customer display name',
          },
          photoURL: {
            type: 'string',
            example: '',
            description: 'Optional avatar URL',
          },
        },
      },
      LoginRequestBody: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'admin@acs.com',
            description: 'Registered user email',
          },
          password: {
            type: 'string',
            example: 'AdminSecure123!',
            description: 'Account password',
          },
        },
      },
      RefreshTokenRequestBody: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            example: '8e1c6679-7425-40de-944b-e07fc1f90ae7',
            description: 'UUID refresh token obtained from login',
          },
        },
      },
      ChangePasswordRequestBody: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: {
            type: 'string',
            example: 'OldPassword123!',
            description: 'Current password for verification',
          },
          newPassword: {
            type: 'string',
            minLength: 8,
            example: 'NewSecurePass2026!',
            description: 'New password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)',
          },
        },
      },
      UpdateProfileRequestBody: {
        type: 'object',
        properties: {
          displayName: {
            type: 'string',
            example: 'John Jonathan Doe',
            description: 'Updated display name',
          },
          photoURL: {
            type: 'string',
            example: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
            description: 'Updated avatar picture URL',
          },
        },
      },
      UpdateDocumentRequestBody: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'updated_document_title.pdf' },
          category: { type: 'string', example: 'Legal' },
          status: {
            type: 'string',
            enum: ['ready', 'pending', 'processing', 'completed'],
            example: 'processing',
          },
          notes: { type: 'string', example: 'Printed with glossy finish' },
          printOptions: { $ref: '#/components/schemas/PrintOptions' },
        },
      },
      UpdateStatusRequestBody: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['ready', 'pending', 'processing', 'completed'],
            example: 'completed',
            description: 'Updated lifecycle status of the document',
          },
        },
      },
      ContactRequestBody: {
        type: 'object',
        required: ['name', 'mobile', 'email', 'message'],
        properties: {
          name: { type: 'string', example: 'Sarah Connor', description: 'Customer full name' },
          mobile: { type: 'string', example: '+919876543210', description: 'Customer mobile number' },
          email: { type: 'string', format: 'email', example: 'sarah@example.com', description: 'Customer email' },
          message: {
            type: 'string',
            example: 'I need help printing and certifying multiple immigration documents.',
            description: 'Inquiry details',
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Authentication required. Please provide a valid Bearer token.',
              error: { code: 'UNAUTHORIZED' },
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient permissions (Admin role required)',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Access forbidden: Administrator privileges required',
              error: { code: 'FORBIDDEN' },
            },
          },
        },
      },
      ValidationError: {
        description: 'Bad Request - Input validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Request validation failed',
              error: {
                code: 'VALIDATION_ERROR',
                details: [
                  { path: 'body.email', message: 'Required' },
                  { path: 'body.password', message: 'Required' },
                ],
              },
            },
          },
        },
      },
      NotFoundError: {
        description: 'Requested resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Document not found',
              error: { code: 'NOT_FOUND' },
            },
          },
        },
      },
      RateLimitError: {
        description: 'Too many requests - Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Too many requests, please try again later.',
              error: { code: 'RATE_LIMIT_EXCEEDED' },
            },
          },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new customer account',
        description:
          'Create a new customer account with email, strong password, and display name. Returns JWT access and refresh tokens.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequestBody' },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'User registered successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/RateLimitError' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User login with email and password',
        description:
          'Authenticate with email and password to receive access token and refresh token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequestBody' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login successful' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  success: false,
                  message: 'Invalid email or password',
                  error: { code: 'INVALID_CREDENTIALS' },
                },
              },
            },
          },
          429: { $ref: '#/components/responses/RateLimitError' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        description:
          'Exchange a valid refresh token for a brand new access token and rotating refresh token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequestBody' },
            },
          },
        },
        responses: {
          200: {
            description: 'Tokens refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Tokens refreshed successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimitError' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout user session',
        description: 'Revoke active refresh token and invalidate authentication session.',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: {
                    type: 'string',
                    example: '8e1c6679-7425-40de-944b-e07fc1f90ae7',
                    description: 'Optional refresh token to explicitly revoke',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Logged out successfully' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        summary: 'Get current user profile',
        description: 'Fetch the authenticated user profile using the Bearer access token.',
        responses: {
          200: {
            description: 'Profile fetched successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Profile fetched successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        summary: 'Change user password',
        description:
          'Allows an authenticated user to change their account password. Terminates all existing sessions upon change.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChangePasswordRequestBody' },
            },
          },
        },
        responses: {
          200: {
            description: 'Password changed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'Password changed successfully. All other sessions terminated.',
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/users/profile': {
      patch: {
        tags: ['Users'],
        security: [{ BearerAuth: [] }],
        summary: 'Update current user profile',
        description: 'Update the display name or photo URL of the currently authenticated user.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProfileRequestBody' },
            },
          },
        },
        responses: {
          200: {
            description: 'Profile updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Profile updated successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/documents': {
      post: {
        tags: ['Documents'],
        summary: 'Upload document file to AWS S3 & Queue',
        description:
          'Upload one or more document files (PDF, PNG, JPG, DOCX, XLSX, etc.) to AWS S3 and enqueue for printing. Supports both authenticated users and guest kiosk imports.',
        security: [{ BearerAuth: [] }, {}],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'File to upload (max 25MB each; repeat this field for multiple files)',
                  },
                  category: {
                    type: 'string',
                    default: 'Print Job',
                    example: 'Identity & Visa',
                    description: 'Category / tag for organization',
                  },
                  notes: {
                    type: 'string',
                    example: 'Please print 2 double-sided copies',
                    description: 'Optional printing notes or instructions',
                  },
                  importedBy: {
                    type: 'string',
                    example: 'Front Desk Operator',
                    description: 'Name of person or kiosk importing the document',
                  },
                  userEmail: {
                    type: 'string',
                    example: 'customer@example.com',
                    description: 'Contact email for guest imports',
                  },
                  printOptions: {
                    type: 'string',
                    example: '{"orientation":"portrait","colorMode":"color","paperSize":"A4","copies":1}',
                    description: 'JSON string of print options (orientation, colorMode, paperSize, copies)',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Document uploaded and queued successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Document imported and stored successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        document: { $ref: '#/components/schemas/Document' },
                        documents: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Document' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/RateLimitError' },
        },
      },
      get: {
        tags: ['Documents'],
        security: [{ BearerAuth: [] }],
        summary: 'List customer documents',
        description: 'Retrieve paginated documents belonging to the authenticated customer with search and filter options.',
        parameters: [
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1, minimum: 1 },
            description: 'Page number',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
            description: 'Items per page',
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['ready', 'pending', 'processing', 'completed'],
            },
            description: 'Filter by document queue status',
          },
          {
            name: 'category',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filter by category name',
          },
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Search document name or notes',
          },
          {
            name: 'sortBy',
            in: 'query',
            required: false,
            schema: { type: 'string', default: 'createdAt' },
            description: 'Field to sort by',
          },
          {
            name: 'sortOrder',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            description: 'Sorting direction',
          },
        ],
        responses: {
          200: {
            description: 'Documents retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Documents retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Document' },
                        },
                      },
                    },
                    pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/documents/{id}': {
      get: {
        tags: ['Documents'],
        security: [{ BearerAuth: [] }],
        summary: 'Get single document details',
        description: 'Fetch full metadata for a document by its unique ID.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Unique document ID',
            example: '65e8b1c423456789abcdef99',
          },
        ],
        responses: {
          200: {
            description: 'Document details retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Document details retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        document: { $ref: '#/components/schemas/Document' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
      delete: {
        tags: ['Documents'],
        security: [{ BearerAuth: [] }],
        summary: 'Delete document file',
        description: 'Permanently deletes document record and underlying file from AWS S3.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Unique document ID',
            example: '65e8b1c423456789abcdef99',
          },
        ],
        responses: {
          200: {
            description: 'Document deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Document deleted successfully' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/documents/{id}/download': {
      get: {
        tags: ['Documents'],
        security: [{ BearerAuth: [] }],
        summary: 'Generate temporary presigned download URL',
        description:
          'Generates a secure, temporary AWS S3 presigned URL for direct viewing or downloading of the document.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Unique document ID',
            example: '65e8b1c423456789abcdef99',
          },
        ],
        responses: {
          200: {
            description: 'Presigned URL generated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Download URL generated successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        downloadUrl: {
                          type: 'string',
                          example: 'https://acs-customer-service-docs.s3.eu-north-1.amazonaws.com/...',
                        },
                        fileName: { type: 'string', example: 'passport_scan.pdf' },
                        expiresIn: { type: 'integer', example: 900, description: 'Expiry duration in seconds' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/admin/documents': {
      get: {
        tags: ['Admin Queue'],
        security: [{ BearerAuth: [] }],
        summary: 'Get all queue documents (Admin)',
        description:
          'Retrieve all documents across all users in the print queue with administrative filtering and pagination.',
        parameters: [
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1 },
            description: 'Page number',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 50 },
            description: 'Items per page',
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['ready', 'pending', 'processing', 'completed'],
            },
            description: 'Filter by queue status',
          },
          {
            name: 'category',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filter by document category',
          },
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Search document name, user email, or importedBy',
          },
          {
            name: 'sortBy',
            in: 'query',
            required: false,
            schema: { type: 'string', default: 'createdAt' },
          },
          {
            name: 'sortOrder',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        ],
        responses: {
          200: {
            description: 'Admin document queue retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Queue retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Document' },
                        },
                      },
                    },
                    pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/admin/documents/{id}': {
      put: {
        tags: ['Admin Queue'],
        security: [{ BearerAuth: [] }],
        summary: 'Update queue document (Admin)',
        description: 'Update document metadata, status, print settings, or operator notes.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Unique document ID',
            example: '65e8b1c423456789abcdef99',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateDocumentRequestBody' },
            },
          },
        },
        responses: {
          200: {
            description: 'Document updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Document updated successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        document: { $ref: '#/components/schemas/Document' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
      delete: {
        tags: ['Admin Queue'],
        security: [{ BearerAuth: [] }],
        summary: 'Delete queue document as Admin',
        description: 'Permanently remove document record and delete file from S3 storage.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Unique document ID',
            example: '65e8b1c423456789abcdef99',
          },
        ],
        responses: {
          200: {
            description: 'Document permanently deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Document record and file permanently deleted' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/admin/documents/{id}/status': {
      patch: {
        tags: ['Admin Queue'],
        security: [{ BearerAuth: [] }],
        summary: 'Update queue document status (Admin)',
        description: 'Quickly transition a document through lifecycle statuses: ready -> pending -> processing -> completed.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Unique document ID',
            example: '65e8b1c423456789abcdef99',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateStatusRequestBody' },
            },
          },
        },
        responses: {
          200: {
            description: 'Status updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Document status updated to completed' },
                    data: {
                      type: 'object',
                      properties: {
                        document: { $ref: '#/components/schemas/Document' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/admin/stats': {
      get: {
        tags: ['Admin Queue'],
        security: [{ BearerAuth: [] }],
        summary: 'Get queue analytics & dashboard stats (Admin)',
        description:
          'Retrieve aggregated metrics on total queue documents, status counts, storage used, and customer numbers.',
        responses: {
          200: {
            description: 'Admin analytics stats returned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Admin analytics retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        totalDocuments: { type: 'integer', example: 120 },
                        statusBreakdown: {
                          type: 'object',
                          properties: {
                            ready: { type: 'integer', example: 15 },
                            pending: { type: 'integer', example: 40 },
                            processing: { type: 'integer', example: 5 },
                            completed: { type: 'integer', example: 60 },
                          },
                        },
                        todayUploads: { type: 'integer', example: 18 },
                        totalStorageBytes: { type: 'integer', example: 85400300 },
                        totalCustomers: { type: 'integer', example: 54 },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/contact': {
      post: {
        tags: ['Contact Support'],
        summary: 'Submit customer inquiry / cyber desk request',
        description:
          'Submit a general inquiry or document printing request to the ACS support team.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ContactRequestBody' },
            },
          },
        },
        responses: {
          201: {
            description: 'Inquiry submitted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Inquiry submitted successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        inquiry: { $ref: '#/components/schemas/ContactInquiry' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
      get: {
        tags: ['Contact Support'],
        security: [{ BearerAuth: [] }],
        summary: 'List customer inquiries (Admin)',
        description: 'Retrieve paginated customer inquiries submitted via contact form.',
        parameters: [
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1, minimum: 1 },
            description: 'Page number',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
            description: 'Items per page',
          },
        ],
        responses: {
          200: {
            description: 'Customer inquiries retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Inquiries retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/ContactInquiry' },
                        },
                      },
                    },
                    pagination: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'System health check',
        description: 'Basic health check probe verifying HTTP service availability.',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'ACS Customer Service Centre API is healthy' },
                    timestamp: { type: 'string', example: '2026-09-08T10:45:00.000Z' },
                    uptime: { type: 'number', example: 342.5 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['System'],
        summary: 'System readiness check',
        description: 'Readiness probe verifying database connectivity before routing live traffic.',
        responses: {
          200: {
            description: 'Service and database are ready',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Service is ready to handle traffic' },
                    status: {
                      type: 'object',
                      properties: {
                        database: { type: 'string', example: 'connected' },
                      },
                    },
                  },
                },
              },
            },
          },
          503: {
            description: 'Service unavailable - Database disconnected',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Service unavailable: Database not connected' },
                    status: {
                      type: 'object',
                      properties: {
                        database: { type: 'string', example: 'disconnected' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const router = Router();
router.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      tryItOutEnabled: true,
    },
    customSiteTitle: 'ACS Customer Service API Documentation',
  })
);

export default router;
