'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import type {
  AuthConfig,
  AuthError,
  AuthProvider as AuthProviderType,
  AuthResponse,
  AuthSession,
  AuthState,
  AuthUser,
  SignInCredentials,
  SignUpCredentials,
  UpdatePasswordRequest,
  UseAuthReturn,
} from '../types';
import { AuthApiClient, createAuthApiClient } from '../utils/api';
import {
  clearOAuthState,
  getProviderConfig,
  getStoredOAuthState,
  initiateOAuthFlow,
  parseOAuthCallback,
} from '../utils/oauth';
import { createTokenManager, TokenManager } from '../utils/token';

// ============================================================================
// State Management
// ============================================================================

type AuthAction =
  | { type: 'LOADING' }
  | { type: 'AUTHENTICATED'; user: AuthUser; session: AuthSession }
  | { type: 'UNAUTHENTICATED' }
  | { type: 'ERROR'; error: AuthError }
  | { type: 'UPDATE_USER'; user: AuthUser }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, isLoading: true, error: null };
    case 'AUTHENTICATED':
      return {
        user: action.user,
        session: action.session,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'UNAUTHENTICATED':
      return {
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'ERROR':
      return { ...state, isLoading: false, error: action.error };
    case 'UPDATE_USER':
      return { ...state, user: action.user };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface AuthContextValue extends UseAuthReturn {
  config: AuthConfig;
  tokenManager: TokenManager;
  apiClient: AuthApiClient;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface AuthProviderProps {
  children: React.ReactNode;
  config: AuthConfig;
}

export function AuthProvider({ children, config }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Create stable instances
  const tokenManager = useMemo(
    () => createTokenManager(config),
    [config.tokenStorage, config.cookieOptions]
  );

  const apiClient = useMemo(
    () => createAuthApiClient(config, tokenManager),
    [config, tokenManager]
  );

  // Ref for auto-refresh interval
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to create session from response
  const createSession = useCallback(
    (response: AuthResponse, provider: AuthProviderType = 'email'): AuthSession => {
      return {
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt: Date.now() + response.expiresIn * 1000,
        provider,
      };
    },
    []
  );

  // Handle successful authentication
  const handleAuthSuccess = useCallback(
    async (response: AuthResponse, provider: AuthProviderType = 'email') => {
      const session = createSession(response, provider);

      tokenManager.setAccessToken(response.accessToken, response.expiresIn);
      if (response.refreshToken) {
        tokenManager.setRefreshToken(response.refreshToken);
      }

      dispatch({ type: 'AUTHENTICATED', user: response.user, session });

      // Call callback if provided
      if (config.callbacks?.onSignIn) {
        await config.callbacks.onSignIn(response.user, session);
      }
    },
    [config.callbacks, tokenManager, createSession]
  );

  // Sign in with credentials
  const signIn = useCallback(
    async (credentials: SignInCredentials): Promise<AuthResponse> => {
      dispatch({ type: 'LOADING' });

      try {
        const response = await apiClient.signIn(credentials);
        await handleAuthSuccess(response, 'email');
        return response;
      } catch (error) {
        const authError = error as AuthError;
        dispatch({ type: 'ERROR', error: authError });
        config.callbacks?.onError?.(authError);
        throw error;
      }
    },
    [apiClient, handleAuthSuccess, config.callbacks]
  );

  // Sign up with credentials
  const signUp = useCallback(
    async (credentials: SignUpCredentials): Promise<AuthResponse> => {
      dispatch({ type: 'LOADING' });

      try {
        const response = await apiClient.signUp(credentials);
        await handleAuthSuccess(response, 'email');
        return response;
      } catch (error) {
        const authError = error as AuthError;
        dispatch({ type: 'ERROR', error: authError });
        config.callbacks?.onError?.(authError);
        throw error;
      }
    },
    [apiClient, handleAuthSuccess, config.callbacks]
  );

  // Sign out
  const signOut = useCallback(async (): Promise<void> => {
    try {
      await apiClient.signOut();
    } catch {
      // Ignore sign out errors
    } finally {
      tokenManager.clearTokens();
      dispatch({ type: 'UNAUTHENTICATED' });
      void config.callbacks?.onSignOut?.();
    }
  }, [apiClient, tokenManager, config.callbacks]);

  // Sign in with OAuth provider
  const signInWithProvider = useCallback(
    async (provider: AuthProviderType): Promise<void> => {
      const providerConfig = getProviderConfig(provider, config.providers);

      if (!providerConfig) {
        throw new Error(`Provider ${provider} is not configured`);
      }

      await initiateOAuthFlow(provider, providerConfig);
    },
    [config.providers]
  );

  // Refresh session
  const refreshSession = useCallback(async (): Promise<AuthSession | null> => {
    try {
      const response = await apiClient.refreshToken();
      const session = createSession(response);

      tokenManager.setAccessToken(response.accessToken, response.expiresIn);
      if (response.refreshToken) {
        tokenManager.setRefreshToken(response.refreshToken);
      }

      dispatch({ type: 'AUTHENTICATED', user: response.user, session });

      return session;
    } catch {
      tokenManager.clearTokens();
      dispatch({ type: 'UNAUTHENTICATED' });
      config.callbacks?.onSessionExpired?.();
      return null;
    }
  }, [apiClient, tokenManager, createSession, config.callbacks]);

  // Reset password
  const resetPassword = useCallback(
    async (email: string): Promise<void> => {
      await apiClient.resetPassword(email);
    },
    [apiClient]
  );

  // Update password
  const updatePassword = useCallback(
    async (request: UpdatePasswordRequest): Promise<void> => {
      await apiClient.updatePassword(request);
    },
    [apiClient]
  );

  // Update user
  const updateUser = useCallback(
    async (data: Partial<AuthUser>): Promise<AuthUser> => {
      const user = await apiClient.updateUser(data);
      dispatch({ type: 'UPDATE_USER', user });
      return user;
    },
    [apiClient]
  );

  // Verify email
  const verifyEmail = useCallback(
    async (token: string): Promise<void> => {
      await apiClient.verifyEmail(token);
    },
    [apiClient]
  );

  // Resend verification
  const resendVerification = useCallback(async (): Promise<void> => {
    await apiClient.resendVerification();
  }, [apiClient]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      // Check for OAuth callback
      const callbackParams = parseOAuthCallback();
      if (callbackParams?.code) {
        const pathParts = window.location.pathname.split('/');
        const provider = pathParts[pathParts.length - 1] as AuthProviderType;
        const storedState = getStoredOAuthState(provider);

        if (storedState && callbackParams.state === storedState.state) {
          try {
            const response = await apiClient.exchangeOAuthCode(
              provider,
              callbackParams.code,
              callbackParams.state
            );
            await handleAuthSuccess(response, provider);
            clearOAuthState(provider);

            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
            return;
          } catch (error) {
            clearOAuthState(provider);
            dispatch({ type: 'ERROR', error: error as AuthError });
            return;
          }
        }
      }

      // Check for existing token
      const token = tokenManager.getAccessToken();

      if (!token) {
        dispatch({ type: 'UNAUTHENTICATED' });
        return;
      }

      // Validate token and get user
      if (tokenManager.isTokenExpired(token)) {
        // Try to refresh
        const refreshToken = tokenManager.getRefreshToken();
        if (refreshToken) {
          await refreshSession();
        } else {
          tokenManager.clearTokens();
          dispatch({ type: 'UNAUTHENTICATED' });
        }
        return;
      }

      // Token is valid, get user
      try {
        const user = await apiClient.getUser();
        const session: AuthSession = {
          user,
          accessToken: token,
          refreshToken: tokenManager.getRefreshToken() || undefined,
          expiresAt: tokenManager.getTokenExpiration(token) || Date.now() + 3600000,
          provider: 'email', // Will be updated from token if available
        };

        dispatch({ type: 'AUTHENTICATED', user, session });
      } catch {
        tokenManager.clearTokens();
        dispatch({ type: 'UNAUTHENTICATED' });
      }
    };

    void initializeAuth();
  }, [apiClient, tokenManager, refreshSession, handleAuthSuccess]);

  // Set up auto-refresh
  useEffect(() => {
    if (config.autoRefresh === false) return;
    if (!state.isAuthenticated) return;

    const threshold = (config.refreshThreshold || 300) * 1000;
    const checkInterval = Math.min(threshold / 2, 60000); // Check at least every minute

    refreshIntervalRef.current = setInterval(() => {
      if (tokenManager.shouldRefresh(config.refreshThreshold || 300)) {
        void refreshSession();
      }
    }, checkInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [
    config.autoRefresh,
    config.refreshThreshold,
    state.isAuthenticated,
    tokenManager,
    refreshSession,
  ]);

  const value: AuthContextValue = useMemo(
    () => ({
      ...state,
      config,
      tokenManager,
      apiClient,
      signIn,
      signUp,
      signOut,
      signInWithProvider,
      refreshSession,
      resetPassword,
      updatePassword,
      updateUser,
      verifyEmail,
      resendVerification,
    }),
    [
      state,
      config,
      tokenManager,
      apiClient,
      signIn,
      signUp,
      signOut,
      signInWithProvider,
      refreshSession,
      resetPassword,
      updatePassword,
      updateUser,
      verifyEmail,
      resendVerification,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}
