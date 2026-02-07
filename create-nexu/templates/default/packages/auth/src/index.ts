// Types
export * from './types';

// Provider
export { AuthProvider, useAuthContext } from './providers';

// Hooks
export { useAuth, useUser, useSession, useRequireAuth } from './hooks';

// Components
export { SignInForm, SignUpForm, SocialButtons, SocialButton, ProtectedRoute } from './components';

// Utilities
export { TokenManager, createTokenManager } from './utils/token';
export { AuthApiClient, createAuthApiClient } from './utils/api';
export {
  generateState,
  generateCodeVerifier,
  generateCodeChallenge,
  buildOAuthUrl,
  getProviderConfig,
  initiateOAuthFlow,
  parseOAuthCallback,
} from './utils/oauth';

// Re-export for convenience
export type {
  AuthConfig,
  AuthUser,
  AuthSession,
  AuthState,
  AuthError,
  AuthErrorCode,
  AuthProvider as AuthProviderType,
  SignInCredentials,
  SignUpCredentials,
  AuthResponse,
  UseAuthReturn,
  UseUserReturn,
  UseSessionReturn,
  SignInFormProps,
  SignUpFormProps,
  SocialButtonsProps,
  ProtectedRouteProps,
} from './types';
