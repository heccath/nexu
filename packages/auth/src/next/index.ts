// Middleware helpers
export {
  createAuthMiddleware,
  getTokenFromRequest,
  isRequestAuthenticated,
  type AuthMiddlewareConfig,
} from './middleware';

// Server-side helpers (for Server Components)
export {
  getAccessToken,
  getRefreshToken,
  getSession,
  getUser,
  isAuthenticated,
  hasRole,
  hasPermission,
} from './server';
