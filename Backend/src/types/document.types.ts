import { DocumentStatus } from '../constants/documentStatus.constant';

export interface PrintOptions {
  orientation: 'portrait' | 'landscape';
  colorMode: 'color' | 'grayscale' | 'bw';
  paperSize: 'A4' | 'A3' | 'Letter' | 'Legal';
  copies: number;
}

export interface DocumentResponse {
  id: string;
  userId: string;
  s3Bucket: string;
  s3Key: string;
  name: string;
  originalName: string;
  storedName: string;
  size: number;
  mimeType: string;
  extension: string;
  status: DocumentStatus;
  category: string;
  notes?: string;
  importedBy: string;
  userEmail: string;
  importedAt: string;
  printOptions?: PrintOptions;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentListQuery {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
