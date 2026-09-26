import { apiClient, ApiResponse } from './apiClient';

export interface ContactInquiryDto {
  id: string;
  name: string;
  mobile: string;
  email: string;
  message: string;
  status: 'new' | 'in_progress' | 'responded';
  createdAt: string;
}

export const contactApi = {
  async createInquiry(data: {
    name: string;
    mobile: string;
    email: string;
    message: string;
  }): Promise<ContactInquiryDto> {
    const res = await apiClient.post<{ inquiry: ContactInquiryDto }>('/contact', data);
    return res.data!.inquiry;
  },

  async listInquiries(params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    items: ContactInquiryDto[];
    pagination?: ApiResponse['pagination'];
  }> {
    const res = await apiClient.get<{ items: ContactInquiryDto[] }>('/contact', params);
    return {
      items: res.data?.items || [],
      pagination: res.pagination,
    };
  },
};
