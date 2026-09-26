import { apiClient, ApiResponse } from './apiClient';

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  role: 'USER' | 'ADMIN';
  photoURL?: string;
  isEmailVerified?: boolean;
  lastLogin?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseData {
  user: UserDto;
  tokens: AuthTokens;
}

export const authApi = {
  async getAdminStatus(): Promise<boolean> {
    const res = await apiClient.get<{ adminAvailable: boolean }>('/auth/admin-status');
    return res.data?.adminAvailable ?? false;
  },

  async login(credentials: { email: string; password: string }): Promise<AuthResponseData> {
    const res = await apiClient.post<AuthResponseData>('/auth/login', credentials);
    if (res.data?.tokens) {
      apiClient.setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
    }
    return res.data!;
  },

  async register(data: {
    email: string;
    password: string;
    displayName: string;
    photoURL?: string;
    role?: 'USER' | 'ADMIN';
  }): Promise<AuthResponseData> {
    const res = await apiClient.post<AuthResponseData>('/auth/register', data);
    if (res.data?.tokens) {
      apiClient.setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
    }
    return res.data!;
  },

  async getMe(): Promise<UserDto> {
    const res = await apiClient.get<{ user: UserDto }>('/auth/me');
    return res.data!.user;
  },

  async logout(): Promise<void> {
    const refreshToken = apiClient.getRefreshToken();
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      apiClient.clearTokens();
    }
  },

  async changePassword(passwords: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse> {
    return apiClient.post('/auth/change-password', passwords);
  },

  async updateProfile(updates: {
    displayName?: string;
    photoURL?: string;
  }): Promise<{ user: UserDto }> {
    const res = await apiClient.patch<{ user: UserDto }>('/users/profile', updates);
    return res.data!;
  },
};
