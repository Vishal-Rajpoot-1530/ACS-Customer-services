import request from 'supertest';
import { app } from '../../src/app';
import { s3Service } from '../../src/services/s3.service';
import { documentRepository } from '../../src/repositories/document.repository';
import { userRepository } from '../../src/repositories/user.repository';
import { generateAccessToken } from '../../src/utils/jwt.util';
import { UserRoles } from '../../src/constants/roles.constant';
import { DocumentStatuses } from '../../src/constants/documentStatus.constant';

describe('Document API Integration Tests', () => {
  const userToken = generateAccessToken({
    userId: '66d84f001122334455667788',
    email: 'user@acscentre.com',
    role: UserRoles.USER,
    displayName: 'Customer User',
  });

  const adminToken = generateAccessToken({
    userId: '66d84f001122334455667799',
    email: 'admin@acscentre.com',
    role: UserRoles.ADMIN,
    displayName: 'Admin Officer',
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/documents (Upload)', () => {
    it('should successfully upload a valid PDF document', async () => {
      jest.spyOn(s3Service, 'uploadFile').mockResolvedValueOnce({
        bucket: 'acs-customer-documents-test',
        key: 'documents/66d84f.../test.pdf',
      });

      jest.spyOn(documentRepository, 'create').mockResolvedValueOnce({
        _id: '66d85a0011223344556677aa',
        userId: '66d84f001122334455667788',
        originalName: 'application.pdf',
        storedName: 'application.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        extension: 'pdf',
        status: DocumentStatuses.READY,
        category: 'Print Job',
        importedBy: 'Customer User',
        userEmail: 'user@acscentre.com',
        importedAt: '07:20 PM',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const pdfBuffer = Buffer.from('%PDF-1.4 sample PDF document for testing');

      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .field('category', 'Print Job')
        .attach('file', pdfBuffer, 'application.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.document.originalName).toBe('application.pdf');
    });

    it('should upload multiple documents in one request', async () => {
      jest.spyOn(s3Service, 'uploadFile').mockResolvedValue({
        bucket: 'acs-customer-documents-test',
        key: 'documents/66d84f.../document.pdf',
      });

      jest.spyOn(documentRepository, 'create')
        .mockResolvedValueOnce({
          _id: '66d85a0011223344556677aa',
          userId: '66d84f001122334455667788',
          originalName: 'first.pdf',
          storedName: 'first.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          extension: 'pdf',
          status: DocumentStatuses.READY,
          category: 'Print Job',
          importedBy: 'Customer User',
          userEmail: 'user@acscentre.com',
          importedAt: '07:20 PM',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .mockResolvedValueOnce({
          _id: '66d85a0011223344556677ab',
          userId: '66d84f001122334455667788',
          originalName: 'second.pdf',
          storedName: 'second.pdf',
          size: 2048,
          mimeType: 'application/pdf',
          extension: 'pdf',
          status: DocumentStatuses.READY,
          category: 'Print Job',
          importedBy: 'Customer User',
          userEmail: 'user@acscentre.com',
          importedAt: '07:20 PM',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', Buffer.from('%PDF-1.4 first'), 'first.pdf')
        .attach('file', Buffer.from('%PDF-1.4 second'), 'second.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.documents).toHaveLength(2);
      expect(res.body.data.documents.map((document: { originalName: string }) => document.originalName))
        .toEqual(['first.pdf', 'second.pdf']);
    });

    it('should reject unsupported executable file extensions with 400', async () => {
      const exeBuffer = Buffer.from('MZ... executable content');

      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', exeBuffer, 'malicious.exe');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/documents (List)', () => {
    it('should return paginated list of user documents', async () => {
      jest.spyOn(documentRepository, 'findByUserId').mockResolvedValueOnce({
        items: [
          {
            _id: '66d85a0011223344556677aa',
            userId: '66d84f001122334455667788',
            originalName: 'document1.pdf',
            storedName: 'document1.pdf',
            size: 512,
            mimeType: 'application/pdf',
            extension: 'pdf',
            status: DocumentStatuses.READY,
            category: 'Print Job',
            importedBy: 'Customer User',
            userEmail: 'user@acscentre.com',
            importedAt: '07:20 PM',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });

      const res = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
    });
  });

  describe('Document sharing', () => {
    it('lists registered users for the share popup without returning the current user', async () => {
      jest.spyOn(userRepository, 'findAll').mockResolvedValueOnce([
        { id: '66d84f001122334455667788', email: 'user@acscentre.com', displayName: 'Customer User', role: UserRoles.USER },
        { id: 'recipient-1', email: 'recipient@acscentre.com', displayName: 'Recipient', role: UserRoles.ADMIN },
      ] as any);

      const res = await request(app)
        .get('/api/v1/users/share-directory')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users).toEqual([
        { id: 'recipient-1', email: 'recipient@acscentre.com', displayName: 'Recipient', role: UserRoles.ADMIN },
      ]);
    });

    it('lists files shared by the authenticated account with recipient details', async () => {
      jest.spyOn(documentRepository, 'findSharedByUser').mockResolvedValueOnce([{
        document: { id: 'document-1', userId: 'owner-1', originalName: 'shared.pdf' } as any,
        recipientId: 'recipient-1',
        recipientEmail: 'recipient@acscentre.com',
        recipientName: 'Recipient',
        sharedAt: new Date('2026-09-01T00:00:00.000Z'),
      }]);

      const res = await request(app)
        .get('/api/v1/documents/shared-by-me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].document.originalName).toBe('shared.pdf');
      expect(res.body.data.items[0].recipientEmail).toBe('recipient@acscentre.com');
    });

    it('shares an owned document with a registered user', async () => {
      jest.spyOn(documentRepository, 'findById').mockResolvedValueOnce({
        id: 'document-1', userId: '66d84f001122334455667788',
      } as any);
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce({
        id: 'recipient-1', email: 'recipient@acscentre.com', displayName: 'Recipient',
      } as any);
      const shareWith = jest.spyOn(documentRepository, 'shareWith').mockResolvedValueOnce();

      const res = await request(app)
        .post('/api/v1/documents/document-1/shares')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'recipient@acscentre.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.recipientEmail).toBe('recipient@acscentre.com');
      expect(shareWith).toHaveBeenCalledWith('document-1', 'recipient-1', '66d84f001122334455667788');
    });

    it('shares an owned document with all eligible registered users', async () => {
      jest.spyOn(documentRepository, 'findById').mockResolvedValueOnce({
        id: 'document-1', userId: '66d84f001122334455667788',
      } as any);
      const shareWithAll = jest.spyOn(documentRepository, 'shareWithAll').mockResolvedValueOnce(4);

      const res = await request(app)
        .post('/api/v1/documents/document-1/shares/all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sharedCount).toBe(4);
      expect(shareWithAll).toHaveBeenCalledWith('document-1', '66d84f001122334455667788', '66d84f001122334455667788');
    });

    it('rejects sharing with an email that is not registered', async () => {
      jest.spyOn(documentRepository, 'findById').mockResolvedValueOnce({
        id: 'document-1', userId: '66d84f001122334455667788',
      } as any);
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/documents/document-1/shares')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'unknown@acscentre.com' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('allows a recipient to list and download a shared document', async () => {
      jest.spyOn(documentRepository, 'findSharesWithUser').mockResolvedValueOnce([
        {
          document: { id: 'document-1', userId: 'owner-1', originalName: 'shared.pdf' } as any,
          sharedByName: 'File owner',
          sharedByEmail: 'owner@acscentre.com',
        },
      ]);
      const list = await request(app)
        .get('/api/v1/documents/shared')
        .set('Authorization', `Bearer ${userToken}`);
      expect(list.status).toBe(200);
      expect(list.body.data.items).toHaveLength(1);

      jest.spyOn(documentRepository, 'findById').mockResolvedValueOnce({
        id: 'document-1', userId: 'owner-1', originalName: 'shared.pdf', s3Key: 'documents/shared.pdf',
      } as any);
      jest.spyOn(documentRepository, 'isSharedWithUser').mockResolvedValueOnce(true);
      jest.spyOn(s3Service, 'getPresignedDownloadUrl').mockResolvedValueOnce('https://s3.test/shared.pdf');

      const download = await request(app)
        .get('/api/v1/documents/document-1/download')
        .set('Authorization', `Bearer ${userToken}`);
      expect(download.status).toBe(200);
      expect(download.body.data.url).toBe('https://s3.test/shared.pdf');
    });
  });

  describe('GET /api/v1/documents/:id/download', () => {
    it('should generate a temporary presigned S3 download URL', async () => {
      const mockDoc = {
        _id: '66d85a0011223344556677aa',
        userId: '66d84f001122334455667788',
        originalName: 'document1.pdf',
        s3Key: 'documents/user/test.pdf',
      };

      jest.spyOn(documentRepository, 'findById').mockResolvedValueOnce(mockDoc as any);
      jest
        .spyOn(s3Service, 'getPresignedDownloadUrl')
        .mockResolvedValueOnce('https://s3.ap-south-1.amazonaws.com/test-bucket/signed-url');

      const res = await request(app)
        .get(`/api/v1/documents/${mockDoc._id}/download`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toContain('https://s3');
      expect(res.body.data.expiresIn).toBe(300);
    });

    it('should return 403 when user attempts to download another user document', async () => {
      const mockDoc = {
        _id: '66d85a0011223344556677bb',
        userId: 'different_user_id_9999',
        originalName: 'secret.pdf',
        s3Key: 'documents/diff/secret.pdf',
      };

      jest.spyOn(documentRepository, 'findById').mockResolvedValueOnce(mockDoc as any);

      const res = await request(app)
        .get(`/api/v1/documents/${mockDoc._id}/download`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Admin Authorization', () => {
    it('should allow Admin to access queue analytics', async () => {
      jest.spyOn(documentRepository, 'getQueueStats').mockResolvedValueOnce({
        totalDocuments: 10,
        readyDocuments: 2,
        processingDocuments: 3,
        completedDocuments: 5,
      });
      jest.spyOn(userRepository, 'countCustomers').mockResolvedValueOnce(5);

      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalDocuments).toBe(10);
      expect(res.body.data.totalCustomers).toBe(5);
    });

    it('should reject non-admin user accessing /api/v1/admin/stats with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
