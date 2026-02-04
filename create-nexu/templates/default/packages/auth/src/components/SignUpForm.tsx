'use client';

import React, { useState } from 'react';

import { useAuth } from '../hooks/useAuth';
import type { AuthError, SignUpFormProps } from '../types';

import { SocialButtons } from './SocialButtons';

/**
 * Sign up form component
 *
 * @example
 * ```tsx
 * <SignUpForm
 *   providers={['google', 'github']}
 *   onSuccess={(response) => router.push('/onboarding')}
 *   showName
 *   signInUrl="/signin"
 * />
 * ```
 */
export function SignUpForm({
  onSuccess,
  onError,
  providers = [],
  showName = true,
  signInUrl = '/signin',
  redirectUrl,
  className,
}: SignUpFormProps) {
  const { signUp, isLoading, error } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    try {
      const response = await signUp({
        email,
        password,
        name: showName ? name : undefined,
      });
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

        {showName && (
          <div>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              placeholder="John Doe"
            />
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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            placeholder="••••••••"
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      {providers.length > 0 && (
        <>
          <div>
            <span>Or continue with</span>
          </div>
          <SocialButtons
            providers={providers}
            mode="signup"
            onSuccess={() => {
              if (redirectUrl && typeof window !== 'undefined') {
                window.location.href = redirectUrl;
              }
            }}
            onError={onError}
          />
        </>
      )}

      {signInUrl && (
        <p>
          Already have an account? <a href={signInUrl}>Sign in</a>
        </p>
      )}
    </div>
  );
}
