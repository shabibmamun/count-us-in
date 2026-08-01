import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding') || pathname.startsWith('/invite');

  const { supabaseResponse, user } = await updateSession(request);

  if (isProtectedRoute) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      
      // Prevent open redirect vulnerabilities
      const safeNext = pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/dashboard';
      loginUrl.searchParams.set('next', safeNext);
      
      return NextResponse.redirect(loginUrl);
    }
  }

  // Enforce search engine headers on protected directories
  if (pathname.startsWith('/dashboard')) {
    supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/invite/:path*'],
};
