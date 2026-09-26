import { NextFunction, Request, Response } from 'express';
import { documentService } from '../services/document.service';
import { userRepository } from '../repositories/user.repository';
import { sendPaginated, sendSuccess } from '../utils/response';
import { UserRoles } from '../constants/roles.constant';
import { userService } from '../services/user.service';

export class AdminController {
  async getUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.listUsers();
      sendSuccess(res, 'Users retrieved successfully', { users });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.deleteUser(req.params.id, req.user!.userId);
      sendSuccess(res, 'User and associated documents permanently deleted');
    } catch (error) {
      next(error);
    }
  }

  async getQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50,
        status: req.query.status as string,
        category: req.query.category as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      const result = await documentService.getAdminQueue(query);

      sendPaginated(res, 'Queue retrieved successfully', result.items, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async updateDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, category, status, notes, printOptions } = req.body;

      const updated = await documentService.updateDocument(id, {
        name,
        category,
        status,
        notes,
        printOptions,
      });

      sendSuccess(res, 'Document updated successfully', { document: updated });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updated = await documentService.updateStatus(id, status);

      sendSuccess(res, `Document status updated to ${status}`, { document: updated });
    } catch (error) {
      next(error);
    }
  }

  async deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = req.user!.userId;

      await documentService.deleteDocument(id, adminId, UserRoles.ADMIN);

      sendSuccess(res, 'Document record and file permanently deleted');
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [queueStats, totalCustomers] = await Promise.all([
        documentService.getAdminStats(),
        userRepository.countCustomers(),
      ]);

      sendSuccess(res, 'Admin analytics retrieved successfully', {
        ...queueStats,
        totalCustomers,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
