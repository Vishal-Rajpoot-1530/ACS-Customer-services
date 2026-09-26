// Centralized API Client for ACS Customer Service Backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Array<{ path: string; message: string }>;
  status: number;
}

class ApiClient {
  private refreshPromise: Promise<string | null> | null = null;

  private async performTokenRefresh(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        this.clearTokens();
        return null;
      }

      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccessToken = refreshData.data?.accessToken;
          const newRefreshToken = refreshData.data?.refreshToken;
          if (newAccessToken) {
            this.setTokens(newAccessToken, newRefreshToken || refreshToken);
            return newAccessToken;
          }
        }
        this.clearTokens();
        return null;
      } catch {
        this.clearTokens();
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  public getAccessToken(): string | null {
    return localStorage.getItem('acs_access_token');
  }

  public getRefreshToken(): string | null {
    return localStorage.getItem('acs_refresh_token');
  }

  public setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('acs_access_token', accessToken);
    localStorage.setItem('acs_refresh_token', refreshToken);
  }

  public clearTokens(): void {
    localStorage.removeItem('acs_access_token');
    localStorage.removeItem('acs_refresh_token');
    localStorage.removeItem('acs_auth_user');
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers = new Headers(options.headers || {});

    // Attach JWT Bearer token if present
    const token = this.getAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Set JSON content type if body is not FormData
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    let response = await fetch(url, config);

    // If 401 Unauthorized, automatically refresh access token and retry seamlessly
    if (
      response.status === 401 &&
      !endpoint.includes('/auth/refresh') &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/register')
    ) {
      const freshAccessToken = await this.performTokenRefresh();
      if (freshAccessToken) {
        headers.set('Authorization', `Bearer ${freshAccessToken}`);
        response = await fetch(url, { ...options, headers });
      }
    }

    // Parse JSON response safely
    let json: any = {};
    try {
      json = await response.json();
    } catch {
      json = { success: response.ok, message: response.statusText };
    }

    if (!response.ok) {
      const error: ApiError = {
        message: json.message || 'An error occurred while communicating with the server',
        code: json.error?.code,
        details: json.error?.details,
        status: response.status,
      };
      throw error;
    }

    return json as ApiResponse<T>;
  }

  public get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  public post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  public put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  public patch<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  public delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
