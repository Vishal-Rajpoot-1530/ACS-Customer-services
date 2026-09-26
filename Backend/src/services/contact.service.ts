import { IContactInquiry } from '../models/contactInquiry.model';
import { contactInquiryRepository } from '../repositories/contactInquiry.repository';

export class ContactService {
  async createInquiry(data: {
    name: string;
    mobile: string;
    email: string;
    message: string;
  }): Promise<IContactInquiry> {
    return contactInquiryRepository.create(data);
  }

  async listInquiries(page: number = 1, limit: number = 20): Promise<{
    items: IContactInquiry[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { items, total } = await contactInquiryRepository.findPaged(page, limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export const contactService = new ContactService();
