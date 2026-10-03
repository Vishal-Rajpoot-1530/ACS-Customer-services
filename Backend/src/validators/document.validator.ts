import { z } from 'zod';
import { DocumentStatuses } from '../constants/documentStatus.constant';

export const listDocumentsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.string().optional(),
    category: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const documentIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
  }),
});

export const shareDocumentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
  }),
  body: z.object({
    email: z.string().trim().email().max(255),
  }),
});

export const revokeDocumentShareSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
    recipientId: z.string().min(1, 'Recipient ID is required'),
  }),
});

export const updateDocumentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    status: z.enum([
      DocumentStatuses.READY,
      DocumentStatuses.PENDING,
      DocumentStatuses.PROCESSING,
      DocumentStatuses.COMPLETED,
    ]).optional(),
    notes: z.string().optional(),
    printOptions: z
      .object({
        orientation: z.enum(['portrait', 'landscape']).default('portrait'),
        colorMode: z.enum(['color', 'grayscale', 'bw']).default('color'),
        paperSize: z.enum(['A4', 'A3', 'Letter', 'Legal']).default('A4'),
        copies: z.coerce.number().int().min(1).default(1),
      })
      .optional(),
  }),
});

export const updateStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
  }),
  body: z.object({
    status: z.enum([
      DocumentStatuses.READY,
      DocumentStatuses.PENDING,
      DocumentStatuses.PROCESSING,
      DocumentStatuses.COMPLETED,
    ]),
  }),
});
