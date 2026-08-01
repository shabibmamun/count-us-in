'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Logo from '@/components/Logo';
import Link from 'next/link';

export default function InvitationPage() {
  const { id } = useParams() as { id: string };
  const { joinWorkspace, user } = useApp();
  const router = useRouter();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const acceptInvite = async () => {
      if (!user) {
        // Must login/register first
        setStatus('error');
        setErrorMsg('Please sign in or create an account first to join the workspace.');
        return;
      }

      try {
        await joinWorkspace(id);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'The invitation link is invalid or has expired.');
      }
    };

    if (id) {
      acceptInvite();
    }
  }, [id, user]);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Logo className="mx-auto h-12 w-12 text-primary" />
        
        <div className="mt-8 bg-white py-8 px-6 border border-border shadow-xs rounded-lg sm:px-10">
          
          {status === 'verifying' && (
            <div className="space-y-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Verifying Invitation</h3>
              <p className="text-xs text-muted-foreground">Checking security token hashes and dates...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary text-primary mx-auto flex items-center justify-center font-bold text-xl">
                ✓
              </div>
              <h3 className="font-bold text-lg text-primary">You’re in</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You now have access to the shared group workspace.
              </p>
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="px-6 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-md hover:opacity-90 inline-block"
                >
                  Enter Workspace
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-destructive mx-auto flex items-center justify-center font-bold text-lg">
                !
              </div>
              <h3 className="font-bold text-sm text-destructive uppercase tracking-wider">Verification failed</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {errorMsg}
              </p>
              
              {!user ? (
                <div className="flex gap-2 justify-center pt-2">
                  <Link
                    href={`/signup?redirect=/invite/${id}`}
                    className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-md hover:opacity-90"
                  >
                    Sign Up
                  </Link>
                  <Link
                    href={`/login?redirect=/invite/${id}`}
                    className="px-4 py-2 border border-border text-primary font-bold text-xs rounded-md hover:bg-secondary"
                  >
                    Sign In
                  </Link>
                </div>
              ) : (
                <div className="pt-2">
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 border border-border text-muted-foreground hover:text-primary text-xs rounded-md"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
