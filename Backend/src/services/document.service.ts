import path from 'path';
import { documentRepository } from '../repositories/document.repository';
import { userRepository } from '../repositories/user.repository';
import { s3Service } from './s3.service';
import {
  buildS3ObjectKey,
  sanitizeFilename,
  validateUploadedFile,
} from '../utils/fileSecurity.util';
import { AppError } from '../utils/appError';
import { HttpStatusCodes } from '../constants/httpStatusCodes.constant';
import { DocumentStatus, DocumentStatuses } from '../constants/documentStatus.constant';
import { UserRole, UserRoles } from '../constants/roles.constant';
import {
  DocumentListQuery,
  DocumentResponse,
  PaginationResult,
  PrintOptions,
} from '../types/document.types';
import { IDocument, documentId } from '../models/document.model';
import { env } from '../config/env.config';

export class DocumentService {
  private formatDocumentResponse(doc: IDocument): DocumentResponse {
    return {
      id: documentId(doc),
      userId: doc.userId.toString(),
      s3Bucket: doc.s3Bucket,
      s3Key: doc.s3Key,
      name: doc.originalName,
      originalName: doc.originalName,
      storedName: doc.storedName,
      size: doc.size,
      mimeType: doc.mimeType,
      extension: doc.extension,
      status: doc.status,
      category: doc.category,
      notes: doc.notes,
      importedBy: doc.importedBy,
      userEmail: doc.userEmail,
      importedAt: doc.importedAt,
      printOptions: doc.printOptions,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async uploadDocument(
    file: Express.Multer.File,
    metadata: {
      category?: string;
      notes?: string;
      importedBy?: string;
      userEmail?: string;
      printOptions?: PrintOptions;
    },
    user: { userId: string; email: string; displayName: string; role: UserRole }
  ): Promise<DocumentResponse> {
    validateUploadedFile(file);

    const userId = user.userId;
    const originalName = file.originalname;
    const sanitized = sanitizeFilename(originalName);
    const ext = path.extname(originalName).replace('.', '').toLowerCase();
    const s3Key = buildS3ObjectKey(userId, sanitized);

    // 1. Upload to AWS S3
    await s3Service.uploadFile(file.buffer, s3Key, file.mimetype, {
      originalName,
      userId,
    });

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newDoc = await documentRepository.create({
      userId,
      originalName,
      storedName: sanitized,
      s3Bucket: env.AWS_S3_BUCKET_NAME,
      s3Key,
      mimeType: file.mimetype,
      extension: ext,
      size: file.size,
      status: DocumentStatuses.READY,
      category: metadata.category || 'Print Job',
      notes: metadata.notes || '',
      importedBy: metadata.importedBy || user.displayName,
      userEmail: metadata.userEmail || user.email,
      importedAt: formattedTime,
      printOptions: metadata.printOptions,
    });

    return this.formatDocumentResponse(newDoc);
  }

  async getUserDocuments(
    userId: string,
    query: DocumentListQuery
  ): Promise<PaginationResult<DocumentResponse>> {
    const result = await documentRepository.findByUserId(userId, query);
    return {
      items: result.items.map((doc) => this.formatDocumentResponse(doc)),
      pagination: result.pagination,
    };
  }

  async getSharedDocuments(userId: string): Promise<Array<DocumentResponse & {
    sharedByName: string;
    sharedByEmail: string;
  }>> {
    const shares = await documentRepository.findSharesWithUser(userId);
    return shares.map((share) => ({
      ...this.formatDocumentResponse(share.document),
      sharedByName: share.sharedByName,
      sharedByEmail: share.sharedByEmail,
    }));
  }

  async getDocumentsSharedByUser(userId: string): Promise<Array<{
    document: DocumentResponse;
    recipientId: string;
    recipientEmail: string;
    recipientName: string;
    sharedAt: Date;
  }>> {
    const shares = await documentRepository.findSharedByUser(userId);
    return shares.map((share) => ({
      document: this.formatDocumentResponse(share.document),
      recipientId: share.recipientId,
      recipientEmail: share.recipientEmail,
      recipientName: share.recipientName,
      sharedAt: share.sharedAt,
    }));
  }

  async shareDocument(
    id: string,
    ownerId: string,
    userRole: UserRole,
    recipientEmail: string
  ): Promise<{ recipientEmail: string; recipientName: string }> {
    const doc = await documentRepository.findById(id);
    if (!doc) {
      throw new AppError('Document not found', HttpStatusCodes.NOT_FOUND, 'DOCUMENT_NOT_FOUND');
    }
    if (userRole !== UserRoles.ADMIN && doc.userId.toString() !== ownerId) {
      throw new AppError('Only the document owner can share this document', HttpStatusCodes.FORBIDDEN, 'FORBIDDEN');
    }

    const recipient = await userRepository.findByEmail(recipientEmail);
    if (!recipient) {
      throw new AppError('No registered user was found with that email', HttpStatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
    }
    if (recipient.id.toString() === doc.userId.toString()) {
      throw new AppError('You already own this document', HttpStatusCodes.BAD_REQUEST, 'INVALID_SHARE_RECIPIENT');
    }

    await documentRepository.shareWith(id, recipient.id.toString(), ownerId);
    return { recipientEmail: recipient.email, recipientName: recipient.displayName };
  }

  async shareDocumentWithAll(
    id: string,
    sharedByUserId: string,
    userRole: UserRole
  ): Promise<{ sharedCount: number }> {
    const doc = await documentRepository.findById(id);
    if (!doc) {
      throw new AppError('Document not found', HttpStatusCodes.NOT_FOUND, 'DOCUMENT_NOT_FOUND');
    }
    if (userRole !== UserRoles.ADMIN && doc.userId.toString() !== sharedByUserId) {
      throw new AppError('Only the document owner can share this document', HttpStatusCodes.FORBIDDEN, 'FORBIDDEN');
    }

    const sharedCount = await documentRepository.shareWithAll(
      id,
      sharedByUserId,
      doc.userId.toString()
    );
    return { sharedCount };
  }

  async revokeDocumentShare(
    id: string,
    recipientId: string,
    ownerId: string,
    userRole: UserRole
  ): Promise<void> {
    const doc = await documentRepository.findById(id);
    if (!doc) {
      throw new AppError('Document not found', HttpStatusCodes.NOT_FOUND, 'DOCUMENT_NOT_FOUND');
    }
    if (userRole !== UserRoles.ADMIN && doc.userId.toString() !== ownerId) {
      throw new AppError('Only the document owner can manage sharing', HttpStatusCodes.FORBIDDEN, 'FORBIDDEN');
    }
    await documentRepository.revokeShare(id, recipientId);
  }

  async getDocumentById(
    id: string,
    userId: string,
    userRole: UserRole
  ): Promise<DocumentResponse> {
    const doc = await documentRepository.findById(id);
    if (!doc) {
      throw new AppError('Document not found', HttpStatusCodes.NOT_FOUND, 'DOCUMENT_NOT_FOUND');
    }

    if (
      userRole !== UserRoles.ADMIN &&
      doc.userId.toString() !== userId &&
      !(await documentRepository.isSharedWithUser(id, userId))
    ) {
      throw new AppError('Unauthorized to access this document', HttpStatusCodes.FORBIDDEN, 'FORBIDDEN');
    }

    return this.formatDocumentResponse(doc);
  }

  async getDownloadUrl(
    id: string,
    userId: string,
    userRole: UserRole
  ): Promise<{ url: string; downloadUrl: string; expiresIn: number; fileName: string }> {
    const doc = await documentRepository.findById(id);
    if (!doc) {
      throw new AppError('Document not found', HttpStatusCodes.NOT_FOUND, 'DOCUMENT_NOT_FOUND');
    }

    if (
      userRole !== UserRoles.ADMIN &&
      doc.userId.toString() !== userId &&
      !(await documentRepository.isSharedWithUser(id, userId))
    ) {
      throw new AppError('Unauthorized to download this document', HttpStatusCodes.FORBIDDEN, 'FORBIDDEN');
    }

    const url = await s3Service.getPresignedDownloadUrl(
      doc.s3Key,
      doc.originalName,
      env.S3_SIGNED_URL_EXPIRES_IN
    );

    return {
      url,
      downloadUrl: url,
      expiresIn: env.S3_SIGNED_URL_EXPIRES_IN,
      fileName: doc.originalName,
    };
  }

  async deleteDocument(id: string, userId: string, userRole: UserRole): Promise<void> {
    const doc = await documentRepository.findById(id);
    if (!doc) {
      throw new AppError('Document not found', HttpStatusCodes.NOT_FOUND, 'DOCUMENT_NOT_FOUND');
    }

    if (userRole !== UserRoles.ADMIN && doc.userId.toString() !== userId) {
      throw new AppError('Unauthorized to delete this document', HttpStatusCodes.FORBIDDEN, 'FORBIDDEN');
    }

    // 1. Delete from S3
    try {
      await s3Service.deleteFile(doc.s3Key);
    } catch (err) {
      // Continue to remove database record even if S3 delete returns error
    }

    // 2. Delete from MySQL
    await documentRepository.deleteById(id);
  }

  // --- Admin Queue Operations ---

  async getAdminQueue(query: DocumentListQuery): Promise<PaginationResult<DocumentResponse>> {
    const result = await documentRepository.findAll(query);
    return {
      items: result.items.map((doc) => this.formatDocumentResponse(doc)),
      pagination: result.pagination,
    };
  }

  async updateDocument(
    id: string,
    updateData: {
      name?: string;
      category?: string;
      status?: DocumentStatus;
      notes?: string;
      printOptions?: PrintOptions;
    }
  ): Promise<DocumentResponse> {
    const payload: Partial<IDocument> = {};
    if (updateData.name) payload.originalName = updateData.name.trim();
    if (updateData.category) payload.category = updateData.category.trim();
    if (updateData.status) payload.status = updateData.status;
    if (updateData.notes !== undefined) payload.notes = updateData.notes.trim();
    if (updateData.printOptions) payload.printOptions = updateData.printOptions;

    const updated = await documentRepository.updateById(id, payload);
    if (!updated) {
      throw new AppError('Document not found', HttpStatusCodes.NOT_FOUND, 'DOCUMENT_NOT_FOUND');
    }

    return this.formatDocumentResponse(updated);
  }

  async updateStatus(id: string, status: DocumentStatus): Promise<DocumentResponse> {
    const updated = await documentRepository.updateById(id, { status });
    if (!updated) {
      throw new AppError('Document not found', HttpStatusCodes.NOT_FOUND, 'DOCUMENT_NOT_FOUND');
    }
    return this.formatDocumentResponse(updated);
  }

  async getAdminStats(): Promise<{
    totalDocuments: number;
    readyDocuments: number;
    processingDocuments: number;
    completedDocuments: number;
  }> {
    return documentRepository.getQueueStats();
  }
}

export const documentService = new DocumentService();
