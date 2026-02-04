import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

import type { TokenStorage, TokenPayload, AuthConfig } from '../types';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

let memoryStorage: { accessToken?: string; refreshToken?: string } = {};

/**
 * Get the token storage implementation based on config
 */
function getStorage(storage: TokenStorage) {
  switch (storage) {
    case 'localStorage':
      return {
        get: (key: string) => {
          if (typeof window === 'undefined') return null;
          return localStorage.getItem(key);
        },
        set: (key: string, value: string) => {
          if (typeof window === 'undefined') return;
          localStorage.setItem(key, value);
        },
        remove: (key: string) => {
          if (typeof window === 'undefined') return;
          localStorage.removeItem(key);
        },
      };
    case 'cookie':
      return {
        get: (key: string) => Cookies.get(key) || null,
        set: (key: string, value: string, options?: Cookies.CookieAttributes) => {
          Cookies.set(key, value, options);
        },
        remove: (key: string, options?: Cookies.CookieAttributes) => {
          Cookies.remove(key, options);
        },
      };
    case 'memory':
      return {
        get: (key: string) => {
          if (key === ACCESS_TOKEN_KEY) return memoryStorage.accessToken || null;
          if (key === REFRESH_TOKEN_KEY) return memoryStorage.refreshToken || null;
          return null;
        },
        set: (key: string, value: string) => {
          if (key === ACCESS_TOKEN_KEY) memoryStorage.accessToken = value;
          if (key === REFRESH_TOKEN_KEY) memoryStorage.refreshToken = value;
        },
        remove: (key: string) => {
          if (key === ACCESS_TOKEN_KEY) delete memoryStorage.accessToken;
          if (key === REFRESH_TOKEN_KEY) delete memoryStorage.refreshToken;
        },
      };
    default:
      throw new Error(`Unknown storage type: ${storage as string}`);
  }
}

/**
 * Token manager class for handling token storage and validation
 */
export class TokenManager {
  private storage: TokenStorage;
  private cookieOptions?: AuthConfig['cookieOptions'];

  constructor(config: Pick<AuthConfig, 'tokenStorage' | 'cookieOptions'>) {
    this.storage = config.tokenStorage || 'cookie';
    this.cookieOptions = config.cookieOptions;
  }

  /**
   * Get the access token
   */
  getAccessToken(): string | null {
    return getStorage(this.storage).get(ACCESS_TOKEN_KEY);
  }

  /**
   * Get the refresh token
   */
  getRefreshToken(): string | null {
    return getStorage(this.storage).get(REFRESH_TOKEN_KEY);
  }

  /**
   * Set the access token
   */
  setAccessToken(token: string, expiresIn?: number): void {
    const storage = getStorage(this.storage);

    if (this.storage === 'cookie') {
      const expires = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;
      storage.set(ACCESS_TOKEN_KEY, token, {
        expires,
        secure: this.cookieOptions?.secure ?? true,
        sameSite: this.cookieOptions?.sameSite ?? 'lax',
        domain: this.cookieOptions?.domain,
        path: this.cookieOptions?.path ?? '/',
      });
    } else {
      storage.set(ACCESS_TOKEN_KEY, token);
    }
  }

  /**
   * Set the refresh token
   */
  setRefreshToken(token: string): void {
    const storage = getStorage(this.storage);

    if (this.storage === 'cookie') {
      storage.set(REFRESH_TOKEN_KEY, token, {
        expires: 30, // 30 days
        secure: this.cookieOptions?.secure ?? true,
        sameSite: this.cookieOptions?.sameSite ?? 'lax',
        domain: this.cookieOptions?.domain,
        path: this.cookieOptions?.path ?? '/',
        httpOnly: false, // Can't set httpOnly from client-side
      });
    } else {
      storage.set(REFRESH_TOKEN_KEY, token);
    }
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    const storage = getStorage(this.storage);

    if (this.storage === 'cookie') {
      storage.remove(ACCESS_TOKEN_KEY, {
        domain: this.cookieOptions?.domain,
        path: this.cookieOptions?.path ?? '/',
      });
      storage.remove(REFRESH_TOKEN_KEY, {
        domain: this.cookieOptions?.domain,
        path: this.cookieOptions?.path ?? '/',
      });
    } else {
      storage.remove(ACCESS_TOKEN_KEY);
      storage.remove(REFRESH_TOKEN_KEY);
    }

    // Also clear memory storage
    memoryStorage = {};
  }

  /**
   * Decode the access token
   */
  decodeToken(token?: string): TokenPayload | null {
    const tokenToDecode = token || this.getAccessToken();
    if (!tokenToDecode) return null;

    try {
      return jwtDecode<TokenPayload>(tokenToDecode);
    } catch {
      return null;
    }
  }

  /**
   * Check if the token is expired
   */
  isTokenExpired(token?: string, threshold: number = 0): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return true;

    const expiresAt = payload.exp * 1000;
    return Date.now() >= expiresAt - threshold * 1000;
  }

  /**
   * Get token expiration time in milliseconds
   */
  getTokenExpiration(token?: string): number | null {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return null;
    return payload.exp * 1000;
  }

  /**
   * Check if we should refresh the token
   */
  shouldRefresh(threshold: number = 300): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    return this.isTokenExpired(token, threshold);
  }
}

/**
 * Create a token manager instance
 */
export function createTokenManager(
  config: Pick<AuthConfig, 'tokenStorage' | 'cookieOptions'>
): TokenManager {
  return new TokenManager(config);
}
