'use client';

import { useCallback } from 'react';

import { useAuthContext } from '../providers/AuthContext';
import type { UseSessionReturn } from '../types';

/**
 * Hook to access and manage the current session
 *
 * @example
 * ```tsx
 * function SessionInfo() {
 *   const { session, isLoading, isValid, getToken, refresh } = useSession();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!session) return <div>No session</div>;
 *
 *   return (
 *     <div>
 *       <p>Session valid: {isValid() ? 'Yes' : 'No'}</p>
 *       <p>Expires at: {new Date(session.expiresAt).toLocaleString()}</p>
 *       <button onClick={refresh}>Refresh Session</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSession(): UseSessionReturn {
  const context = useAuthContext();

  const isValid = useCallback((): boolean => {
    if (!context.session) return false;
    return Date.now() < context.session.expiresAt;
  }, [context.session]);

  const getToken = useCallback((): string | null => {
    return context.tokenManager.getAccessToken();
  }, [context.tokenManager]);

  return {
    session: context.session,
    isLoading: context.isLoading,
    refresh: context.refreshSession,
    isValid,
    getToken,
  };
}
