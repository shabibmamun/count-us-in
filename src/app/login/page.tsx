'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { ChevronDown, ChevronUp, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';

function LoginFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Collapsible accordion state for traditional forms
  const [showTraditionalAuth, setShowTraditionalAuth] = useState(false);
  const [method, setMethod] = useState<'password' | 'magic-link'>('password');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const nextPath = searchParams.get('next') || '/dashboard';
  const safeRedirect = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard';

  // Read error parameter passed from /auth/callback Route Handler
  const authError = searchParams.get('error');

  useEffect(() => {
    if (authError) {
      // Decode and report the exact auth error
      if (authError === 'invalid-code-or-config') {
        setError('Verification Code Mismatch: Google authentication did not return a valid session code.');
      } else if (authError.startsWith('oauth-error')) {
        setError(`Google Access Blocked: ${decodeURIComponent(authError)}`);
      } else if (authError === 'missing-authorization-code') {
        setError('Missing Authentication Credentials: Secure code callback parameter was empty.');
      } else {
        setError(`Secure Session Handshake Failed: ${decodeURIComponent(authError)}`);
      }
    }
  }, [authError]);

  const [originUrl, setOriginUrl] = useState('https://count-us-in.vercel.app');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
  }, []);

  const googleOAuthUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
    `${originUrl}/auth/callback?next=${encodeURIComponent(safeRedirect)}`
  )}`;

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authErr) throw authErr;
      router.push(safeRedirect);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeRedirect)}`,
        }
      });
      if (authErr) throw authErr;
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center bg-[#F7F4EC] py-12 px-6 lg:px-8 overflow-hidden select-none">
      
      {/* Decorative blurred background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#0AA99D]/8 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#E5A823]/6 blur-[120px] pointer-events-none"></div>

      <div className="relative w-full max-w-md z-10 space-y-6">
        
        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-md py-10 px-8 border border-[#BFD1CA]/60 shadow-[0_8px_32px_rgba(7,63,59,0.06)] rounded-[24px] sm:px-10 space-y-6 transition-all duration-300">
          
          {/* Brand Header */}
          <div className="text-center space-y-3">
            <Logo className="mx-auto h-20 w-auto text-[#073F3B]" />
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-[#073F3B] tracking-tight">
                Welcome back
              </h2>
              <p className="text-xs font-semibold text-[#506A64]">
                Sign in with Google to securely access your shared money workspace.
              </p>
            </div>
          </div>

          {/* Diagnostic status warnings */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200/60 text-[#C85450] text-xs font-semibold rounded-[12px] flex items-start gap-2.5 animate-pulse">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action: Google OAuth login */}
          <div className="space-y-3">
            <a
              href={googleOAuthUrl}
              className="w-full flex justify-center items-center gap-3 py-3.5 border border-[#BFD1CA] rounded-[14px] bg-white text-sm font-bold text-[#073F3B] hover:bg-[#F4F6F4] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all text-center block"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.822-6.3-6.3s2.822-6.3 6.3-6.3c1.553 0 2.964.566 4.053 1.503l3.056-3.056C19.1 2.505 15.89 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.48 0 11.24-4.564 11.24-11.24 0-.768-.073-1.504-.2-2.215H12.24z"/>
              </svg>
              Continue with Google
            </a>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-[#BFD1CA]/60"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
              <span className="bg-white/0 px-3 text-[#667A75]">Security verification</span>
            </div>
          </div>

          {/* Secondary Action: Collapsible traditional auth credentials panel */}
          <div className="border border-[#BFD1CA]/60 rounded-[14px] bg-[#F9FAF9] overflow-hidden transition-all duration-300">
            <button
              onClick={() => {
                setShowTraditionalAuth(!showTraditionalAuth);
                setError('');
              }}
              type="button"
              className="w-full px-4 py-3 flex justify-between items-center text-xs font-bold text-[#073F3B] hover:bg-[#F4F6F4] transition-all"
            >
              <span>Sign in with password or magic link</span>
              {showTraditionalAuth ? (
                <ChevronUp className="h-4 w-4 text-[#506A64]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#506A64]" />
              )}
            </button>

            {showTraditionalAuth && (
              <div className="p-4 border-t border-[#BFD1CA]/60 space-y-4 bg-white animate-slide-down">
                
                {/* Method selector tabs */}
                <div className="flex bg-[#F4F6F4] p-1 rounded-[10px] text-xs font-bold text-center">
                  <button
                    onClick={() => { setMethod('password'); setError(''); }}
                    type="button"
                    className={`flex-1 py-2 rounded-[8px] transition-all ${
                      method === 'password' ? 'bg-white text-[#073F3B] shadow-xs' : 'text-[#667A75] hover:text-[#073F3B]'
                    }`}
                  >
                    Password
                  </button>
                  <button
                    onClick={() => { setMethod('magic-link'); setError(''); }}
                    type="button"
                    className={`flex-1 py-2 rounded-[8px] transition-all ${
                      method === 'magic-link' ? 'bg-white text-[#073F3B] shadow-xs' : 'text-[#667A75] hover:text-[#073F3B]'
                    }`}
                  >
                    Magic link
                  </button>
                </div>

                {method === 'password' && (
                  <form className="space-y-4" onSubmit={handlePasswordSignIn}>
                    <div>
                      <label htmlFor="email" className="block text-[10px] font-bold text-[#073F3B] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0AA99D]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label htmlFor="pass" className="block text-[10px] font-bold text-[#073F3B] uppercase tracking-wider flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5" /> Password
                        </label>
                        <Link href="/reset-password" className="text-[10px] font-bold text-[#0AA99D] hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                      <input
                        id="pass"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0AA99D]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-[#073F3B] hover:bg-[#087F78] text-white font-bold rounded-[10px] text-xs transition-all shadow-xs disabled:opacity-50 flex justify-center items-center gap-1.5"
                    >
                      {isLoading ? 'Signing in...' : 'Sign in with Password'}
                      {!isLoading && <ArrowRight className="h-3.5 w-3.5" />}
                    </button>
                  </form>
                )}

                {method === 'magic-link' && (
                  <>
                    {isSubmitted ? (
                      <div className="text-center space-y-3 py-4">
                        <div className="w-10 h-10 rounded-full bg-[#EDF6F3] text-[#0AA99D] mx-auto flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <h3 className="font-bold text-sm text-[#073F3B]">Check your inbox</h3>
                        <p className="text-xs text-[#506A64] leading-relaxed">
                          We sent a secure, passwordless sign-in link to <span className="font-bold text-[#073F3B]">{email}</span>. Click the link to access your workspace.
                        </p>
                      </div>
                    ) : (
                      <form className="space-y-4" onSubmit={handleMagicLinkSignIn}>
                        <div>
                          <label htmlFor="magic_email" className="block text-[10px] font-bold text-[#073F3B] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" /> Email Address
                          </label>
                          <input
                            id="magic_email"
                            type="email"
                            required
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0AA99D]"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full py-3 bg-[#073F3B] hover:bg-[#087F78] text-white font-bold rounded-[10px] text-xs transition-all shadow-xs disabled:opacity-50 flex justify-center items-center gap-1.5"
                        >
                          {isLoading ? 'Sending link...' : 'Send secure sign-in link'}
                          {!isLoading && <ArrowRight className="h-3.5 w-3.5" />}
                        </button>
                      </form>
                    )}
                  </>
                )}

              </div>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="mt-6 flex justify-between items-center text-xs border-t border-[#BFD1CA]/60 pt-4 text-[#506A64] font-semibold">
            <span>New to Count Us In?</span>
            <Link href="/signup" className="font-bold text-[#0AA99D] hover:underline flex items-center gap-0.5">
              Create your space <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F4EC] flex flex-col items-center justify-center text-[#073F3B]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0AA99D]"></div>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
