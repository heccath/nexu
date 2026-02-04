'use client';

import { useEffect } from 'react';

import { useAuth } from './useAuth';

interface UseRequireAuthOptions {
  /**
   * Redirect to this URL if not authenticated
   */
  redirectTo?: string;

  /**
   * Callback when not authenticated
   */
  onUnauthenticated?: () => void;
}

/**
 * Hook to require authentication for a page/component
 *
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const { user, isLoading } = useRequireAuth({
 *     redirectTo: '/login',
 *   });
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return <div>Welcome, {user?.name}!</div>;
 * }
 * ```
 */
export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const auth = useAuth();

  useEffect(() => {
    if (auth.isLoading) return;

    if (!auth.isAuthenticated) {
      if (options.redirectTo && typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        const redirectUrl = new URL(options.redirectTo, window.location.origin);
        redirectUrl.searchParams.set('returnTo', currentPath);
        window.location.href = redirectUrl.toString();
      }

      options.onUnauthenticated?.();
    }
  }, [auth.isAuthenticated, auth.isLoading, options]);

  return auth;
}
