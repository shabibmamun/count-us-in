'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <Logo className="mx-auto h-12 w-12 text-primary" />
        <h2 className="text-3xl font-extrabold text-primary">Page not found</h2>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
          We couldn’t find the page you are looking for. It may have been relocated or you might not have permission to access it.
        </p>
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="px-6 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-md hover:opacity-90 inline-block shadow-xs"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
