'use client';

import { useCallback } from 'react';

import { useAuthContext } from '../providers/AuthContext';
import type { AuthUser, UseUserReturn } from '../types';

/**
 * Hook to access and manage the current user
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { user, isLoading, update } = useUser();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!user) return <div>Not authenticated</div>;
 *
 *   return (
 *     <div>
 *       <h1>{user.name}</h1>
 *       <button onClick={() => update({ name: 'New Name' })}>
 *         Update Name
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUser(): UseUserReturn {
  const context = useAuthContext();

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const user = await context.apiClient.getUser();
      return user;
    } catch {
      return null;
    }
  }, [context.apiClient]);

  return {
    user: context.user,
    isLoading: context.isLoading,
    update: context.updateUser,
    refresh,
  };
}
