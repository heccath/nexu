// ============================================================================
// User Types
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  emailVerified?: boolean;
  provider?: AuthProvider;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Provider Types
// ============================================================================

export type AuthProvider = 'email' | 'google' | 'github' | 'facebook' | 'apple' | 'twitter' | 'custom';

export interface OAuthProviderConfig {
  clientId: string;
  redirectUri?: string;
  scope?: string[];
}

export interface AuthProviderConfig {
  google?: OAuthProviderConfig;
  github?: OAuthProviderConfig;
  facebook?: OAuthProviderConfig;
  apple?: OAuthProviderConfig;
  twitter?: OAuthProviderConfig;
  custom?: {
    name: string;
    authorizationUrl: string;
    tokenUrl: string;
    clientId: string;
    redirectUri?: string;
    scope?: string[];
  };
}

// ============================================================================
// Session & Token Types
// ============================================================================

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  provider: AuthProvider;
}

export interface TokenPayload {
  sub: string;
  email?: string;
  name?: string;
  exp: number;
  iat: number;
  [key: string]: unknown;
}

export type TokenStorage = 'localStorage' | 'cookie' | 'memory';

// ============================================================================
// Auth State Types
// ============================================================================

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: unknown;
}

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'USER_ALREADY_EXISTS'
  | 'EMAIL_NOT_VERIFIED'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'UNKNOWN_ERROR';

// ============================================================================
// Auth Config Types
// ============================================================================

export interface AuthConfig {
  /**
   * Base URL for API requests (e.g., '/api/auth' or 'https://api.example.com/auth')
   */
  apiBaseUrl: string;

  /**
   * OAuth providers configuration
   */
  providers?: AuthProviderConfig;

  /**
   * Token storage method
   * @default 'cookie'
   */
  tokenStorage?: TokenStorage;

  /**
   * Cookie options (only used when tokenStorage is 'cookie')
   */
  cookieOptions?: {
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    domain?: string;
    path?: string;
  };

  /**
   * Auto refresh token before expiration
   * @default true
   */
  autoRefresh?: boolean;

  /**
   * Refresh token before this many seconds before expiration
   * @default 300 (5 minutes)
   */
  refreshThreshold?: number;

  /**
   * Callback URLs
   */
  callbacks?: {
    onSignIn?: (user: AuthUser, session: AuthSession) => void | Promise<void>;
    onSignOut?: () => void | Promise<void>;
    onError?: (error: AuthError) => void;
    onSessionExpired?: () => void;
  };

  /**
   * Custom headers to include in API requests
   */
  headers?: Record<string, string>;

  /**
   * Enable debug mode
   * @default false
   */
  debug?: boolean;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface SignInCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  currentPassword?: string;
  newPassword: string;
  token?: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface OAuthCallbackParams {
  code: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseAuthReturn extends AuthState {
  signIn: (credentials: SignInCredentials) => Promise<AuthResponse>;
  signUp: (credentials: SignUpCredentials) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: AuthProvider) => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (request: UpdatePasswordRequest) => Promise<void>;
  updateUser: (data: Partial<AuthUser>) => Promise<AuthUser>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
}

export interface UseSessionReturn {
  session: AuthSession | null;
  isLoading: boolean;
  refresh: () => Promise<AuthSession | null>;
  isValid: () => boolean;
  getToken: () => string | null;
}

export interface UseUserReturn {
  user: AuthUser | null;
  isLoading: boolean;
  update: (data: Partial<AuthUser>) => Promise<AuthUser>;
  refresh: () => Promise<AuthUser | null>;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface SignInFormProps {
  onSuccess?: (response: AuthResponse) => void;
  onError?: (error: AuthError) => void;
  providers?: AuthProvider[];
  showRememberMe?: boolean;
  showForgotPassword?: boolean;
  forgotPasswordUrl?: string;
  signUpUrl?: string;
  redirectUrl?: string;
  className?: string;
}

export interface SignUpFormProps {
  onSuccess?: (response: AuthResponse) => void;
  onError?: (error: AuthError) => void;
  providers?: AuthProvider[];
  showName?: boolean;
  signInUrl?: string;
  redirectUrl?: string;
  className?: string;
}

export interface SocialButtonsProps {
  providers: AuthProvider[];
  onSuccess?: (provider: AuthProvider) => void;
  onError?: (error: AuthError) => void;
  mode?: 'signin' | 'signup';
  className?: string;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  roles?: string[];
  permissions?: string[];
}
