'use client';

import { useAuthContext } from '../providers/AuthContext';
import type { UseAuthReturn } from '../types';

/**
 * Hook to access authentication state and methods
 *
 * @example
 * ```tsx
 * function LoginButton() {
 *   const { isAuthenticated, user, signIn, signOut } = useAuth();
 *
 *   if (isAuthenticated) {
 *     return (
 *       <div>
 *         <span>Welcome, {user?.name}</span>
 *         <button onClick={signOut}>Sign Out</button>
 *       </div>
 *     );
 *   }
 *
 *   return (
 *     <button onClick={() => signIn({ email: 'user@example.com', password: 'password' })}>
 *       Sign In
 *     </button>
 *   );
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  const context = useAuthContext();

  return {
    user: context.user,
    session: context.session,
    isAuthenticated: context.isAuthenticated,
    isLoading: context.isLoading,
    error: context.error,
    signIn: context.signIn,
    signUp: context.signUp,
    signOut: context.signOut,
    signInWithProvider: context.signInWithProvider,
    refreshSession: context.refreshSession,
    resetPassword: context.resetPassword,
    updatePassword: context.updatePassword,
    updateUser: context.updateUser,
    verifyEmail: context.verifyEmail,
    resendVerification: context.resendVerification,
  };
}
