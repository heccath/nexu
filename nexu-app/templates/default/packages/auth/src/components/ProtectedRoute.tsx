'use client';

import { useRequireAuth } from '../hooks/useRequireAuth';
import type { ProtectedRouteProps } from '../types';

/**
 * Protected route component that requires authentication
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ProtectedRoute redirectTo="/login">
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * // With loading fallback
 * <ProtectedRoute
 *   redirectTo="/login"
 *   fallback={<LoadingSpinner />}
 * >
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * // With role-based access
 * <ProtectedRoute
 *   redirectTo="/unauthorized"
 *   roles={['admin', 'moderator']}
 * >
 *   <AdminPanel />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  fallback,
  redirectTo = '/login',
  roles,
  permissions,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useRequireAuth({
    redirectTo,
  });

  // Show loading state
  if (isLoading) {
    return fallback ? <>{fallback}</> : null;
  }

  // Not authenticated - useRequireAuth will handle redirect
  if (!isAuthenticated) {
    return fallback ? <>{fallback}</> : null;
  }

  // Check roles if specified
  if (roles && roles.length > 0) {
    const userRoles = (user?.metadata?.roles as string[]) || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return fallback ? <>{fallback}</> : null;
    }
  }

  // Check permissions if specified
  if (permissions && permissions.length > 0) {
    const userPermissions = (user?.metadata?.permissions as string[]) || [];
    const hasPermission = permissions.every(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      return fallback ? <>{fallback}</> : null;
    }
  }

  return <>{children}</>;
}
