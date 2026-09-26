import { NextFunction, Request, Response } from 'express';
import { contactService } from '../services/contact.service';
import { sendCreated, sendPaginated } from '../utils/response';

export class ContactController {
  async createInquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, mobile, email, message } = req.body;
      const inquiry = await contactService.createInquiry({ name, mobile, email, message });

      sendCreated(res, 'Inquiry submitted successfully', { inquiry });
    } catch (error) {
      next(error);
    }
  }

  async listInquiries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await contactService.listInquiries(page, limit);

      sendPaginated(res, 'Inquiries retrieved successfully', result.items, result.pagination);
    } catch (error) {
      next(error);
    }
  }
}

export const contactController = new ContactController();
