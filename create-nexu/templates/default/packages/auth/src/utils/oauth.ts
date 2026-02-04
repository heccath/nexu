import type { AuthProvider, AuthProviderConfig, OAuthProviderConfig } from '../types';

/**
 * OAuth provider URLs
 */
const OAUTH_URLS: Record<string, { authUrl: string; defaultScope: string[] }> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    defaultScope: ['openid', 'email', 'profile'],
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    defaultScope: ['read:user', 'user:email'],
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    defaultScope: ['email', 'public_profile'],
  },
  apple: {
    authUrl: 'https://appleid.apple.com/auth/authorize',
    defaultScope: ['name', 'email'],
  },
  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    defaultScope: ['users.read', 'tweet.read'],
  },
};

/**
 * Generate a random state string for CSRF protection
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a code verifier for PKCE
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate a code challenge from a code verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Store OAuth state in session storage
 */
export function storeOAuthState(provider: string, state: string, codeVerifier?: string): void {
  if (typeof window === 'undefined') return;

  const data = { state, codeVerifier, timestamp: Date.now() };
  sessionStorage.setItem(`oauth_state_${provider}`, JSON.stringify(data));
}

/**
 * Get stored OAuth state
 */
export function getStoredOAuthState(
  provider: string
): { state: string; codeVerifier?: string } | null {
  if (typeof window === 'undefined') return null;

  const stored = sessionStorage.getItem(`oauth_state_${provider}`);
  if (!stored) return null;

  try {
    const data = JSON.parse(stored) as {
      state: string;
      codeVerifier?: string;
      timestamp: number;
    };

    // Check if state is older than 10 minutes
    if (Date.now() - data.timestamp > 10 * 60 * 1000) {
      sessionStorage.removeItem(`oauth_state_${provider}`);
      return null;
    }

    return { state: data.state, codeVerifier: data.codeVerifier };
  } catch {
    return null;
  }
}

/**
 * Clear stored OAuth state
 */
export function clearOAuthState(provider: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(`oauth_state_${provider}`);
}

/**
 * Build OAuth authorization URL
 */
export function buildOAuthUrl(
  provider: AuthProvider,
  config: OAuthProviderConfig,
  options?: {
    state?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }
): string {
  const providerConfig = OAUTH_URLS[provider];
  if (!providerConfig) {
    throw new Error(`Unknown OAuth provider: ${provider}`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri || `${window.location.origin}/auth/callback/${provider}`,
    response_type: 'code',
    scope: (config.scope || providerConfig.defaultScope).join(' '),
  });

  if (options?.state) {
    params.set('state', options.state);
  }

  if (options?.codeChallenge) {
    params.set('code_challenge', options.codeChallenge);
    params.set('code_challenge_method', options.codeChallengeMethod || 'S256');
  }

  // Provider-specific parameters
  if (provider === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  return `${providerConfig.authUrl}?${params.toString()}`;
}

/**
 * Get the OAuth config for a provider
 */
export function getProviderConfig(
  provider: AuthProvider,
  config?: AuthProviderConfig
): OAuthProviderConfig | null {
  if (!config) return null;

  switch (provider) {
    case 'google':
      return config.google || null;
    case 'github':
      return config.github || null;
    case 'facebook':
      return config.facebook || null;
    case 'apple':
      return config.apple || null;
    case 'twitter':
      return config.twitter || null;
    default:
      return null;
  }
}

/**
 * Initiate OAuth flow
 */
export async function initiateOAuthFlow(
  provider: AuthProvider,
  providerConfig: OAuthProviderConfig,
  usePKCE: boolean = true
): Promise<void> {
  const state = generateState();
  let codeVerifier: string | undefined;
  let codeChallenge: string | undefined;

  if (usePKCE) {
    codeVerifier = generateCodeVerifier();
    codeChallenge = await generateCodeChallenge(codeVerifier);
  }

  storeOAuthState(provider, state, codeVerifier);

  const url = buildOAuthUrl(provider, providerConfig, {
    state,
    codeChallenge,
    codeChallengeMethod: 'S256',
  });

  window.location.href = url;
}

/**
 * Parse OAuth callback URL parameters
 */
export function parseOAuthCallback(): {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
} | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);

  return {
    code: params.get('code') || undefined,
    state: params.get('state') || undefined,
    error: params.get('error') || undefined,
    errorDescription: params.get('error_description') || undefined,
  };
}
