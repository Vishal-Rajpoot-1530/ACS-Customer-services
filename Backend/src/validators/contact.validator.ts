import { z } from 'zod';

export const createContactInquirySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    mobile: z.string().min(6, 'Valid mobile number is required'),
    email: z.string().email('Valid email address is required'),
    message: z.string().min(5, 'Message must be at least 5 characters'),
  }),
});
