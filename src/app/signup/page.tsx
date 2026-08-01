'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';

export default function SignUpPage() {
  const [method, setMethod] = useState<'password' | 'magic-link'>('password');
  
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handlePasswordSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            given_name: displayName,
            full_name: displayName
          }
        }
      });
      if (authErr) throw authErr;
      
      // If it returns user and session directly
      if (data?.session) {
        router.push('/onboarding');
      } else {
        setIsSubmitted(true);
      }
    } catch (err: any) {
      setError(err.message || 'We could not create your account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          data: {
            given_name: displayName,
            full_name: displayName
          }
        }
      });
      if (authErr) throw authErr;
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'We could not send your secure link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setIsLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });
      if (authErr) throw authErr;
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#F7F4EC] py-12 px-6 lg:px-8 select-none">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Logo className="mx-auto h-18 w-auto text-[#073F3B]" />
        <h2 className="mt-6 text-2xl font-extrabold text-[#073F3B] tracking-tight">
          Create your space
        </h2>
        <p className="mt-2 text-xs font-semibold text-[#506A64]">
          Choose your signup method to build one clear view of your money.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 border border-[#BFD1CA] shadow-[0_4px_16px_rgba(7,63,59,0.04)] rounded-[16px] sm:px-10 space-y-6">
          
          {/* Method Selector Tabs */}
          <div className="flex bg-[#F4F6F4] p-1 rounded-[10px] text-xs font-bold text-center">
            <button
              onClick={() => { setMethod('password'); setError(''); }}
              type="button"
              className={`flex-1 py-2 rounded-[8px] transition-all ${
                method === 'password' ? 'bg-white text-[#073F3B] shadow-xs' : 'text-[#667A75] hover:text-[#073F3B]'
              }`}
            >
              Sign up with password
            </button>
            <button
              onClick={() => { setMethod('magic-link'); setError(''); }}
              type="button"
              className={`flex-1 py-2 rounded-[8px] transition-all ${
                method === 'magic-link' ? 'bg-white text-[#073F3B] shadow-xs' : 'text-[#667A75] hover:text-[#073F3B]'
              }`}
            >
              Email me a link
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-[#C85450] text-xs font-semibold rounded-[10px]">
              {error}
            </div>
          )}

          {isSubmitted ? (
            <div className="text-center space-y-3 py-4 animate-scale-up">
              <div className="w-10 h-10 rounded-full bg-[#EDF6F3] text-[#0AA99D] mx-auto flex items-center justify-center font-bold">
                ✓
              </div>
              <h3 className="font-bold text-sm text-[#073F3B]">Check your email</h3>
              <p className="text-xs text-[#506A64] leading-relaxed">
                We sent a validation message to <span className="font-bold text-[#073F3B]">{email}</span>. Click the link to complete setting up your profile.
              </p>
            </div>
          ) : (
            <>
              {method === 'password' && (
                <form className="space-y-4" onSubmit={handlePasswordSignUp}>
                  <div>
                    <label htmlFor="displayName" className="block text-xs font-bold text-[#073F3B] uppercase tracking-wider mb-1">
                      Display name
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      required
                      placeholder="e.g. Nadia"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-[#073F3B] uppercase tracking-wider mb-1">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label htmlFor="pass" className="block text-xs font-bold text-[#073F3B] uppercase tracking-wider mb-1">
                      Password
                    </label>
                    <input
                      id="pass"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#073F3B] hover:bg-[#087F78] text-white font-bold rounded-[10px] text-xs transition-all shadow-xs disabled:opacity-50"
                  >
                    {isLoading ? 'Creating account...' : 'Create Account with Password'}
                  </button>
                </form>
              )}

              {method === 'magic-link' && (
                <form className="space-y-4" onSubmit={handleMagicLinkSignUp}>
                  <div>
                    <label htmlFor="magic_name" className="block text-xs font-bold text-[#073F3B] uppercase tracking-wider mb-1">
                      Display name
                    </label>
                    <input
                      id="magic_name"
                      type="text"
                      required
                      placeholder="e.g. Nadia"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label htmlFor="magic_email" className="block text-xs font-bold text-[#073F3B] uppercase tracking-wider mb-1">
                      Email address
                    </label>
                    <input
                      id="magic_email"
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#073F3B] hover:bg-[#087F78] text-white font-bold rounded-[10px] text-xs transition-all shadow-xs disabled:opacity-50"
                  >
                    {isLoading ? 'Sending link...' : 'Send secure signup link'}
                  </button>
                </form>
              )}
            </>
          )}

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-[#BFD1CA]"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
              <span className="bg-white px-3 text-[#667A75]">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="w-full flex justify-center items-center gap-2.5 py-3 border border-[#BFD1CA] rounded-[10px] bg-white text-xs font-bold text-[#073F3B] hover:bg-[#F4F6F4] transition-all"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.822-6.3-6.3s2.822-6.3 6.3-6.3c1.553 0 2.964.566 4.053 1.503l3.056-3.056C19.1 2.505 15.89 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.48 0 11.24-4.564 11.24-11.24 0-.768-.073-1.504-.2-2.215H12.24z"/>
            </svg>
            Continue with Google
          </button>

          <div className="mt-6 flex justify-between items-center text-xs border-t border-[#BFD1CA] pt-4 text-[#506A64] font-semibold">
            <span>Already have a space?</span>
            <Link href="/login" className="font-bold text-[#0AA99D] hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
