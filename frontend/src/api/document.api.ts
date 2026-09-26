import { apiClient, ApiResponse } from './apiClient';

export interface PrintOptionsDto {
  orientation: 'portrait' | 'landscape';
  colorMode: 'color' | 'grayscale' | 'bw';
  paperSize: 'A4' | 'A3' | 'Letter' | 'Legal';
  copies: number;
}

export interface BackendDocumentDto {
  id: string;
  userId: string;
  s3Bucket: string;
  originalName: string;
  storedName: string;
  s3Key: string;
  mimeType: string;
  extension: string;
  size: number;
  status: 'ready' | 'pending' | 'processing' | 'completed';
  category: string;
  notes?: string;
  importedBy: string;
  userEmail: string;
  importedAt: string;
  printOptions?: PrintOptionsDto;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentUploadMetadata {
  category?: string;
  notes?: string;
  importedBy?: string;
  userEmail?: string;
  printOptions?: PrintOptionsDto | string;
}

export interface ListDocumentsParams {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DownloadUrlResponse {
  url: string;
  downloadUrl: string;
  fileName: string;
  expiresIn: number;
}

export const documentApi = {
  async upload(file: File, metadata: DocumentUploadMetadata = {}): Promise<BackendDocumentDto> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.category) formData.append('category', metadata.category);
    if (metadata.notes) formData.append('notes', metadata.notes);
    if (metadata.importedBy) formData.append('importedBy', metadata.importedBy);
    if (metadata.userEmail) formData.append('userEmail', metadata.userEmail);
    if (metadata.printOptions) {
      formData.append(
        'printOptions',
        typeof metadata.printOptions === 'string'
          ? metadata.printOptions
          : JSON.stringify(metadata.printOptions)
      );
    }

    const res = await apiClient.post<{ document: BackendDocumentDto }>('/documents', formData);
    return res.data!.document;
  },

  async list(params?: ListDocumentsParams): Promise<{
    items: BackendDocumentDto[];
    pagination?: ApiResponse['pagination'];
  }> {
    const res = await apiClient.get<{ items: BackendDocumentDto[] }>('/documents', params);
    return {
      items: res.data?.items || [],
      pagination: res.pagination,
    };
  },

  async listAll(params: Omit<ListDocumentsParams, 'page' | 'limit'> = {}): Promise<BackendDocumentDto[]> {
    const items: BackendDocumentDto[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const result = await this.list({ ...params, page, limit: 100 });
      items.push(...result.items);
      totalPages = result.pagination?.totalPages || 1;
      page += 1;
    } while (page <= totalPages);

    return items;
  },

  async getById(id: string): Promise<BackendDocumentDto> {
    const res = await apiClient.get<{ document: BackendDocumentDto }>(`/documents/${id}`);
    return res.data!.document;
  },

  async getDownloadUrl(id: string): Promise<DownloadUrlResponse> {
    const res = await apiClient.get<DownloadUrlResponse>(`/documents/${id}/download`);
    return res.data!;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },
};
