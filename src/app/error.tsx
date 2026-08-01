'use client';

import React from 'react';
import Logo from '@/components/Logo';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <Logo className="mx-auto h-18 w-auto text-primary" />
        <h2 className="text-3xl font-extrabold text-primary">Something went wrong</h2>
        
        <div className="bg-white py-6 px-6 border border-border shadow-xs rounded-lg sm:px-10 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            We encountered a connection or application error while loading this screen. Your details are safe.
          </p>
          <div className="text-xs font-semibold text-destructive bg-red-50 p-2.5 rounded-md border border-destructive/20 select-none">
            An unexpected error occurred. Reference ID: {error.digest || 'unknown'}
          </div>
          
          <div className="pt-2 flex gap-2">
            <button
              onClick={() => reset()}
              className="w-full py-2 bg-primary text-primary-foreground font-bold text-xs rounded-md hover:opacity-90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
