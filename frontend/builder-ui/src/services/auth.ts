import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantId: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  error?: string;
}

export interface TokenResponse {
  valid: boolean;
  payload?: {
    sub: string;
    email: string;
    tenantId: string;
    roles: string[];
    permissions: string[];
    iat: number;
    exp: number;
    iss: string;
    aud: string;
  };
}

class AuthService {
  private api: AxiosInstance;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private user: AuthUser | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load tokens from localStorage
    this.loadTokensFromStorage();

    // Setup request interceptor
    this.setupRequestInterceptor();

    // Setup response interceptor for token refresh
    this.setupResponseInterceptor();
  }

  private loadTokensFromStorage(): void {
    this.token = localStorage.getItem('auth_token');
    this.refreshToken = localStorage.getItem('refresh_token');
    
    // Populate user from JWT token
    if (this.token) {
      this.populateUserFromToken();
    }
  }

  private saveTokensToStorage(): void {
    if (this.token) {
      localStorage.setItem('auth_token', this.token);
    } else {
      localStorage.removeItem('auth_token');
    }

    if (this.refreshToken) {
      localStorage.setItem('refresh_token', this.refreshToken);
    } else {
      localStorage.removeItem('refresh_token');
    }

    if (this.user) {
      localStorage.setItem('auth_user', JSON.stringify(this.user));
    } else {
      localStorage.removeItem('auth_user');
    }
  }

  private setupRequestInterceptor(): void {
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  private setupResponseInterceptor(): void {
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry && this.refreshToken) {
          originalRequest._retry = true;

          try {
            const refreshResponse = await this.refreshTokens();
            if (refreshResponse.success && refreshResponse.token) {
              this.token = refreshResponse.token;
              this.refreshToken = refreshResponse.refreshToken || this.refreshToken;
              this.saveTokensToStorage();

              // Retry the original request
              originalRequest.headers.Authorization = `Bearer ${this.token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', credentials);
      
      if (response.data.success && response.data.token) {
        this.token = response.data.token;
        this.refreshToken = response.data.refreshToken || null;
        // Populate user from JWT token
        this.populateUserFromToken();
        this.saveTokensToStorage();
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data as AuthResponse;
      }
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.token) {
        await this.api.post('/auth/logout', {});
      }
    } catch (error) {
      // Logout should always succeed locally even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      this.clearTokens();
    }
  }

  private clearTokens(): void {
    console.log('🧹 Clearing authentication tokens...');
    
    // Log current tokens before clearing
    console.log('Before clear - Token:', this.token ? 'exists' : 'null');
    console.log('Before clear - localStorage auth_token:', localStorage.getItem('auth_token') ? 'exists' : 'null');
    
    this.token = null;
    this.refreshToken = null;
    this.user = null;
    
    // Clear localStorage immediately
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    
    // Also clear sessionStorage for any session data
    sessionStorage.clear();
    
    // Verify tokens are cleared
    console.log('After clear - localStorage auth_token:', localStorage.getItem('auth_token') ? 'exists' : 'null');
    console.log('✅ Authentication tokens cleared successfully');
  }

  async refreshTokens(): Promise<AuthResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/refresh', {
        refreshToken: this.refreshToken,
      });

      if (response.data.success && response.data.token) {
        this.token = response.data.token;
        this.refreshToken = response.data.refreshToken || this.refreshToken;
        this.user = response.data.user || this.user;
        this.saveTokensToStorage();
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data as AuthResponse;
      }
      return {
        success: false,
        error: 'Token refresh failed',
      };
    }
  }

  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      return null;
    }
  }

  private populateUserFromToken(): void {
    if (!this.token) {
      return;
    }

    const payload = this.decodeJWT(this.token);
    if (payload) {
      this.user = {
        id: payload.sub,
        email: payload.email,
        firstName: payload.firstName || payload.email?.split('@')[0] || 'User',
        lastName: payload.lastName || '',
        tenantId: payload.tenantId,
        roles: payload.roles || [],
        permissions: payload.permissions || []
      };
    }
  }

  async verifyToken(): Promise<TokenResponse> {
    if (!this.token) {
      return { valid: false };
    }

    try {
      const response: AxiosResponse<TokenResponse> = await this.api.get('/auth/verify');
      return response.data;
    } catch (error) {
      return { valid: false };
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    if (this.user) {
      return this.user;
    }

    if (!this.token) {
      return null;
    }

    try {
      const response = await this.api.get('/users/me');
      this.user = response.data;
      this.saveTokensToStorage();
      return this.user;
    } catch (error) {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  hasPermission(permission: string): boolean {
    return this.user?.permissions?.includes(permission) || false;
  }

  hasRole(role: string): boolean {
    return this.user?.roles?.includes(role) || false;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.user;
    if (!user || !user.roles) return false;
    return roles.some(role => user.roles.includes(role));
  }

  hasAllRoles(roles: string[]): boolean {
    const user = this.user;
    if (!user || !user.roles) return false;
    return roles.every(role => user.roles.includes(role));
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): AuthUser | null {
    return this.user;
  }

  // OAuth2 methods
  async getOAuth2Url(provider: string): Promise<{ authorizationUrl: string } | null> {
    try {
      const response = await this.api.get(`/auth/oauth2/${provider}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async handleOAuth2Callback(provider: string, code: string, state: string, tenantId: string): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await this.api.post(`/auth/oauth2/${provider}/callback`, {
        code,
        state,
        tenantId,
      });

      if (response.data.success && response.data.token) {
        this.token = response.data.token;
        this.refreshToken = response.data.refreshToken || null;
        this.user = response.data.user || null;
        this.saveTokensToStorage();
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data as AuthResponse;
      }
      return {
        success: false,
        error: 'OAuth2 authentication failed',
      };
    }
  }
}

// Create singleton instance
export const authService = new AuthService();

// Export types
export type { AuthService as AuthServiceType };
