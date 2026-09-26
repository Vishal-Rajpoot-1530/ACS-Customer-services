import { apiClient, ApiResponse } from './apiClient';
import { BackendDocumentDto, ListDocumentsParams, PrintOptionsDto } from './document.api';

export interface AdminUserDto {
  id: string;
  email: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
  photoURL?: string;
  lastLogin?: string;
}

export interface AdminStatsDto {
  totalDocuments: number;
  statusBreakdown: {
    ready: number;
    pending: number;
    processing: number;
    completed: number;
  };
  todayUploads: number;
  totalStorageBytes: number;
  totalCustomers: number;
}

export interface UpdateDocumentPayload {
  name?: string;
  category?: string;
  status?: 'ready' | 'pending' | 'processing' | 'completed';
  notes?: string;
  printOptions?: PrintOptionsDto;
}

export const adminApi = {
  async getUsers(): Promise<AdminUserDto[]> {
    const res = await apiClient.get<{ users: AdminUserDto[] }>('/admin/users');
    return res.data?.users || [];
  },

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  },

  async getQueue(params?: ListDocumentsParams): Promise<{
    items: BackendDocumentDto[];
    pagination?: ApiResponse['pagination'];
  }> {
    const res = await apiClient.get<{ items: BackendDocumentDto[] }>('/admin/documents', params);
    return {
      items: res.data?.items || [],
      pagination: res.pagination,
    };
  },

  async getQueueAll(params: Omit<ListDocumentsParams, 'page' | 'limit'> = {}): Promise<BackendDocumentDto[]> {
    const items: BackendDocumentDto[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const result = await this.getQueue({ ...params, page, limit: 100 });
      items.push(...result.items);
      totalPages = result.pagination?.totalPages || 1;
      page += 1;
    } while (page <= totalPages);

    return items;
  },

  async updateDocument(id: string, updates: UpdateDocumentPayload): Promise<BackendDocumentDto> {
    const res = await apiClient.put<{ document: BackendDocumentDto }>(`/admin/documents/${id}`, updates);
    return res.data!.document;
  },

  async updateStatus(
    id: string,
    status: 'ready' | 'pending' | 'processing' | 'completed'
  ): Promise<BackendDocumentDto> {
    const res = await apiClient.patch<{ document: BackendDocumentDto }>(`/admin/documents/${id}/status`, {
      status,
    });
    return res.data!.document;
  },

  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(`/admin/documents/${id}`);
  },

  async getStats(): Promise<AdminStatsDto> {
    const res = await apiClient.get<AdminStatsDto>('/admin/stats');
    return res.data!;
  },
};
