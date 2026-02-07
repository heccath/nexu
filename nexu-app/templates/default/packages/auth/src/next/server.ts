import { cookies } from 'next/headers';

import type { AuthSession, AuthUser, TokenPayload } from '../types';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

/**
 * Decode JWT token (basic decode without verification)
 * For server-side use, you should verify the token with your backend
 */
function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8')) as TokenPayload;
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
 * Get the access token from cookies (Server Components)
 *
 * @example
 * ```tsx
 * // app/dashboard/page.tsx
 * import { getAccessToken } from '@repo/auth/next';
 *
 * export default async function DashboardPage() {
 *   const token = await getAccessToken();
 *
 *   if (!token) {
 *     redirect('/login');
 *   }
 *
 *   // Fetch data with token
 *   const data = await fetch('/api/data', {
 *     headers: { Authorization: `Bearer ${token}` },
 *   });
 *
 *   return <Dashboard data={data} />;
 * }
 * ```
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_KEY)?.value;

  if (!token || isTokenExpired(token)) {
    return null;
  }

  return token;
}

/**
 * Get the refresh token from cookies (Server Components)
 */
export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_KEY)?.value || null;
}

/**
 * Get session from cookies (Server Components)
 *
 * @example
 * ```tsx
 * // app/profile/page.tsx
 * import { getSession } from '@repo/auth/next';
 * import { redirect } from 'next/navigation';
 *
 * export default async function ProfilePage() {
 *   const session = await getSession();
 *
 *   if (!session) {
 *     redirect('/login');
 *   }
 *
 *   return <Profile user={session.user} />;
 * }
 * ```
 */
export async function getSession(): Promise<AuthSession | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const payload = decodeToken(token);
  if (!payload) return null;

  const refreshToken = await getRefreshToken();

  // Build user from token payload
  const user: AuthUser = {
    id: payload.sub,
    email: payload.email || '',
    name: payload.name,
    metadata: {},
  };

  // Copy additional fields from payload to metadata
  const knownFields = ['sub', 'email', 'name', 'exp', 'iat', 'aud', 'iss'];
  for (const [key, value] of Object.entries(payload)) {
    if (!knownFields.includes(key)) {
      user.metadata![key] = value;
    }
  }

  return {
    user,
    accessToken: token,
    refreshToken: refreshToken || undefined,
    expiresAt: payload.exp * 1000,
    provider: 'email', // Will be overwritten if available in token
  };
}

/**
 * Get user from session (Server Components)
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { getUser } from '@repo/auth/next';
 *
 * export default async function RootLayout({ children }) {
 *   const user = await getUser();
 *
 *   return (
 *     <html>
 *       <body>
 *         <Header user={user} />
 *         {children}
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export async function getUser(): Promise<AuthUser | null> {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Check if user is authenticated (Server Components)
 *
 * @example
 * ```tsx
 * // app/admin/layout.tsx
 * import { isAuthenticated } from '@repo/auth/next';
 * import { redirect } from 'next/navigation';
 *
 * export default async function AdminLayout({ children }) {
 *   const authenticated = await isAuthenticated();
 *
 *   if (!authenticated) {
 *     redirect('/login?returnTo=/admin');
 *   }
 *
 *   return <>{children}</>;
 * }
 * ```
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}

/**
 * Check if user has specific roles (Server Components)
 *
 * @example
 * ```tsx
 * // app/admin/page.tsx
 * import { hasRole } from '@repo/auth/next';
 * import { redirect } from 'next/navigation';
 *
 * export default async function AdminPage() {
 *   const isAdmin = await hasRole(['admin', 'superadmin']);
 *
 *   if (!isAdmin) {
 *     redirect('/unauthorized');
 *   }
 *
 *   return <AdminDashboard />;
 * }
 * ```
 */
export async function hasRole(roles: string[]): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const userRoles = (session.user.metadata?.roles as string[]) || [];
  return roles.some(role => userRoles.includes(role));
}

/**
 * Check if user has specific permissions (Server Components)
 */
export async function hasPermission(permissions: string[]): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const userPermissions = (session.user.metadata?.permissions as string[]) || [];
  return permissions.every(perm => userPermissions.includes(perm));
}
