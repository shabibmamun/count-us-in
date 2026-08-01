'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { useApp } from '@/context/AppContext';

export default function LoginPage() {
  const { logIn, logInWithGoogle, isFallbackMode } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await logIn(email);
      setIsSubmitted(true);
      if (isFallbackMode) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Could not find a space with this email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      await logInWithGoogle();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-background py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Logo className="mx-auto h-12 w-12 text-primary" />
        <h2 className="mt-6 text-3xl font-extrabold text-primary">
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to see where things stand.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 border border-border shadow-xs rounded-lg sm:px-10">
          {isSubmitted && !isFallbackMode ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-secondary text-primary mx-auto flex items-center justify-center mb-4">
                ✓
              </div>
              <h3 className="font-bold text-lg text-primary mb-2">Check your inbox</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We sent a secure, passwordless sign-in link to <span className="font-medium text-foreground">{email}</span>. Click the link to return to your workspace.
              </p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 bg-red-50 border border-destructive/20 text-destructive text-sm rounded-md">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-primary mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="pass" className="block text-sm font-medium text-primary">
                    Password (optional)
                  </label>
                  <Link href="/reset-password" className="text-xs font-semibold text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="pass"
                  name="pass"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md shadow-xs bg-input focus:ring-primary focus:border-primary text-sm"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 transition-all focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {isLoading ? 'Sending link...' : 'Sign in'}
                </button>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-border rounded-md shadow-xs bg-white text-xs font-semibold text-primary hover:bg-secondary transition-all"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.822-6.3-6.3s2.822-6.3 6.3-6.3c1.553 0 2.964.566 4.053 1.503l3.056-3.056C19.1 2.505 15.89 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.48 0 11.24-4.564 11.24-11.24 0-.768-.073-1.504-.2-2.215H12.24z"/>
                </svg>
                Sign in with Google
              </button>
            </form>
          )}

          <div className="mt-6 flex justify-between items-center text-xs border-t border-border pt-4 text-muted-foreground">
            <span>New to Count Us In?</span>
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Create your space
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
