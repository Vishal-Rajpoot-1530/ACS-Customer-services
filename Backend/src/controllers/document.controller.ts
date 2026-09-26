import { NextFunction, Request, Response } from 'express';
import { documentService } from '../services/document.service';
import { sendCreated, sendPaginated, sendSuccess } from '../utils/response';
import { AppError } from '../utils/appError';
import { HttpStatusCodes } from '../constants/httpStatusCodes.constant';

export class DocumentController {
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = (req.files as Express.Multer.File[] | undefined)
        || (req.file ? [req.file] : []);

      if (files.length === 0) {
        throw new AppError('File is required', HttpStatusCodes.BAD_REQUEST, 'NO_FILE');
      }

      let printOptions;
      if (req.body.printOptions) {
        try {
          printOptions = typeof req.body.printOptions === 'string'
            ? JSON.parse(req.body.printOptions)
            : req.body.printOptions;
        } catch {
          // ignore parsing error, default options will be used
        }
      }

      const metadata = {
        category: req.body.category,
        notes: req.body.notes,
        importedBy: req.body.importedBy,
        userEmail: req.body.userEmail,
        printOptions,
      };

      const documents = await Promise.all(
        files.map((file) => documentService.uploadDocument(file, metadata, req.user!))
      );

      if (documents.length === 1) {
        sendCreated(res, 'Document imported and stored successfully', { document: documents[0] });
      } else {
        sendCreated(res, 'Documents imported and stored successfully', { documents });
      }
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const query = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        status: req.query.status as string,
        category: req.query.category as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      const result = await documentService.getUserDocuments(userId, query);

      sendPaginated(res, 'Documents retrieved successfully', result.items, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const role = req.user!.role;

      const doc = await documentService.getDocumentById(id, userId, role);

      sendSuccess(res, 'Document details retrieved successfully', { document: doc });
    } catch (error) {
      next(error);
    }
  }

  async getDownloadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const role = req.user!.role;

      const result = await documentService.getDownloadUrl(id, userId, role);

      sendSuccess(res, 'Download URL generated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const role = req.user!.role;

      await documentService.deleteDocument(id, userId, role);

      sendSuccess(res, 'Document deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const documentController = new DocumentController();
