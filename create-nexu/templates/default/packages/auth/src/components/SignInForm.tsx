'use client';

import React, { useState } from 'react';

import { useAuth } from '../hooks/useAuth';
import type { AuthError, SignInFormProps } from '../types';

import { SocialButtons } from './SocialButtons';

/**
 * Sign in form component
 *
 * @example
 * ```tsx
 * <SignInForm
 *   providers={['google', 'github']}
 *   onSuccess={(response) => router.push('/dashboard')}
 *   showRememberMe
 *   showForgotPassword
 *   forgotPasswordUrl="/forgot-password"
 *   signUpUrl="/signup"
 * />
 * ```
 */
export function SignInForm({
  onSuccess,
  onError,
  providers = [],
  showRememberMe = true,
  showForgotPassword = true,
  forgotPasswordUrl = '/forgot-password',
  signUpUrl = '/signup',
  redirectUrl,
  className,
}: SignInFormProps) {
  const { signIn, isLoading, error } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please fill in all fields');
      return;
    }

    try {
      const response = await signIn({ email, password, remember });
      onSuccess?.(response);

      if (redirectUrl && typeof window !== 'undefined') {
        window.location.href = redirectUrl;
      }
    } catch (err) {
      const authError = err as AuthError;
      setFormError(authError.message);
      onError?.(authError);
    }
  };

  const displayError = formError || error?.message;

  return (
    <div className={className}>
      <form onSubmit={(e) => void handleSubmit(e)}>
        {displayError && (
          <div role="alert" aria-live="polite">
            {displayError}
          </div>
        )}

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            placeholder="••••••••"
          />
        </div>

        <div>
          {showRememberMe && (
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={isLoading}
              />
              <span>Remember me</span>
            </label>
          )}

          {showForgotPassword && (
            <a href={forgotPasswordUrl}>Forgot password?</a>
          )}
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {providers.length > 0 && (
        <>
          <div>
            <span>Or continue with</span>
          </div>
          <SocialButtons
            providers={providers}
            mode="signin"
            onSuccess={() => {
              if (redirectUrl && typeof window !== 'undefined') {
                window.location.href = redirectUrl;
              }
            }}
            onError={onError}
          />
        </>
      )}

      {signUpUrl && (
        <p>
          Don&apos;t have an account? <a href={signUpUrl}>Sign up</a>
        </p>
      )}
    </div>
  );
}
