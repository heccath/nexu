import type {
  AuthConfig,
  AuthError,
  AuthErrorCode,
  AuthResponse,
  AuthUser,
  SignInCredentials,
  SignUpCredentials,
  UpdatePasswordRequest,
} from '../types';
import { TokenManager } from './token';

/**
 * Auth API client for making authenticated requests
 */
export class AuthApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private tokenManager: TokenManager;
  private debug: boolean;

  constructor(config: AuthConfig, tokenManager: TokenManager) {
    this.baseUrl = config.apiBaseUrl.replace(/\/$/, '');
    this.headers = config.headers || {};
    this.tokenManager = tokenManager;
    this.debug = config.debug || false;
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log('[Auth]', ...args);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.tokenManager.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.headers,
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    this.log(`${options.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = (await response.json().catch(() => ({}))) as T & {
        message?: string;
        code?: string;
        details?: unknown;
      };

      if (!response.ok) {
        throw this.createError(response.status, data);
      }

      return data;
    } catch (error) {
      if ((error as AuthError).code) {
        throw error;
      }

      throw this.createError(0, {
        message: error instanceof Error ? error.message : 'Network error',
      });
    }
  }

  private createError(status: number, data: { message?: string; code?: string; details?: unknown }): AuthError {
    let code: AuthErrorCode = 'UNKNOWN_ERROR';

    if (data.code) {
      code = data.code as AuthErrorCode;
    } else if (status === 401) {
      code = 'UNAUTHORIZED';
    } else if (status === 403) {
      code = 'FORBIDDEN';
    } else if (status === 404) {
      code = 'USER_NOT_FOUND';
    } else if (status === 409) {
      code = 'USER_ALREADY_EXISTS';
    } else if (status === 0) {
      code = 'NETWORK_ERROR';
    }

    return {
      code,
      message: data.message || 'An error occurred',
      details: data.details,
    };
  }

  /**
   * Sign in with email and password
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    return this.request<AuthResponse>('/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Sign up with email and password
   */
  async signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
    return this.request<AuthResponse>('/signup', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    const refreshToken = this.tokenManager.getRefreshToken();

    await this.request('/signout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = this.tokenManager.getRefreshToken();

    if (!refreshToken) {
      throw this.createError(401, { message: 'No refresh token available' });
    }

    return this.request<AuthResponse>('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  /**
   * Get the current user
   */
  async getUser(): Promise<AuthUser> {
    return this.request<AuthUser>('/me');
  }

  /**
   * Update the current user
   */
  async updateUser(data: Partial<AuthUser>): Promise<AuthUser> {
    return this.request<AuthUser>('/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Request password reset
   */
  async resetPassword(email: string): Promise<void> {
    await this.request('/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Update password
   */
  async updatePassword(request: UpdatePasswordRequest): Promise<void> {
    await this.request('/update-password', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    await this.request('/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  /**
   * Resend verification email
   */
  async resendVerification(): Promise<void> {
    await this.request('/resend-verification', {
      method: 'POST',
    });
  }

  /**
   * Exchange OAuth code for tokens
   */
  async exchangeOAuthCode(provider: string, code: string, state?: string): Promise<AuthResponse> {
    return this.request<AuthResponse>(`/oauth/${provider}/callback`, {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
  }
}

/**
 * Create an auth API client instance
 */
export function createAuthApiClient(config: AuthConfig, tokenManager: TokenManager): AuthApiClient {
  return new AuthApiClient(config, tokenManager);
}
