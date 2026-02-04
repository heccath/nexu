import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ACCESS_TOKEN_KEY = 'auth_access_token';

export interface AuthMiddlewareConfig {
  /**
   * Routes that require authentication
   * Supports glob patterns like '/dashboard/*'
   */
  protectedRoutes?: string[];

  /**
   * Routes that should redirect to home if already authenticated
   */
  authRoutes?: string[];

  /**
   * URL to redirect unauthenticated users
   * @default '/login'
   */
  loginUrl?: string;

  /**
   * URL to redirect authenticated users from auth routes
   * @default '/'
   */
  homeUrl?: string;

  /**
   * Cookie name for access token
   * @default 'auth_access_token'
   */
  tokenCookieName?: string;

  /**
   * Custom callback for additional checks
   */
  onAuthenticated?: (request: NextRequest) => NextResponse | null | undefined;
}

/**
 * Match a path against a pattern (supports wildcards)
 */
function matchPath(path: string, pattern: string): boolean {
  // Exact match
  if (pattern === path) return true;

  // Wildcard at end (e.g., '/dashboard/*')
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2);
    return path === base || path.startsWith(base + '/');
  }

  // Wildcard in middle (e.g., '/api/*/users')
  const regexPattern = pattern.replace(/\*/g, '[^/]+').replace(/\//g, '\\/');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Check if path matches any pattern in the list
 */
function matchesAnyPattern(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchPath(path, pattern));
}

/**
 * Decode JWT token (basic decode without verification)
 */
function decodeToken(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8')) as {
      exp?: number;
    };
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

/**
 * Create authentication middleware for Next.js
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { createAuthMiddleware } from '@repo/auth/next';
 *
 * export const middleware = createAuthMiddleware({
 *   protectedRoutes: ['/dashboard/*', '/settings/*', '/api/protected/*'],
 *   authRoutes: ['/login', '/signup', '/forgot-password'],
 *   loginUrl: '/login',
 *   homeUrl: '/dashboard',
 * });
 *
 * export const config = {
 *   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
 * };
 * ```
 */
export function createAuthMiddleware(config: AuthMiddlewareConfig = {}) {
  const {
    protectedRoutes = [],
    authRoutes = [],
    loginUrl = '/login',
    homeUrl = '/',
    tokenCookieName = ACCESS_TOKEN_KEY,
    onAuthenticated,
  } = config;

  return function authMiddleware(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl;

    // Get token from cookie
    const token = request.cookies.get(tokenCookieName)?.value;
    const isAuthenticated = token && !isTokenExpired(token);

    // Check if route is protected
    const isProtectedRoute = matchesAnyPattern(pathname, protectedRoutes);

    // Check if route is an auth route (login, signup, etc.)
    const isAuthRoute = matchesAnyPattern(pathname, authRoutes);

    // Redirect unauthenticated users from protected routes
    if (isProtectedRoute && !isAuthenticated) {
      const url = new URL(loginUrl, request.url);
      url.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(url);
    }

    // Redirect authenticated users from auth routes
    if (isAuthRoute && isAuthenticated) {
      const returnTo = request.nextUrl.searchParams.get('returnTo');
      const redirectUrl = returnTo || homeUrl;
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // Run custom callback if provided
    if (isAuthenticated && onAuthenticated) {
      const customResponse = onAuthenticated(request);
      if (customResponse) return customResponse;
    }

    return NextResponse.next();
  };
}

/**
 * Helper to get auth token from request (for API routes)
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookie
  const token = request.cookies.get(ACCESS_TOKEN_KEY)?.value;
  return token || null;
}

/**
 * Helper to check if request is authenticated (for API routes)
 */
export function isRequestAuthenticated(request: NextRequest): boolean {
  const token = getTokenFromRequest(request);
  if (!token) return false;
  return !isTokenExpired(token);
}
