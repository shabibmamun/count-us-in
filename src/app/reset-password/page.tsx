'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Could not initiate password reset. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-background py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Logo className="mx-auto h-12 w-12 text-primary" />
        <h2 className="mt-6 text-3xl font-extrabold text-primary">
          Reset your password
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email to receive a recovery link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 border border-border shadow-xs rounded-lg sm:px-10">
          {isSubmitted ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-secondary text-primary mx-auto flex items-center justify-center mb-4">
                ✓
              </div>
              <h3 className="font-bold text-lg text-primary mb-2">Check your email</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If an account exists for <span className="font-medium text-foreground">{email}</span>, a recovery link will arrive in your inbox shortly.
              </p>
              <div className="mt-6">
                <Link href="/login" className="font-semibold text-primary text-sm hover:underline">
                  Back to Sign In
                </Link>
              </div>
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
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 transition-all focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {isLoading ? 'Sending link...' : 'Send reset link'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-xs border-t border-border pt-4">
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
