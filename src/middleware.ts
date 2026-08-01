import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-access-token')?.value;
  const { pathname } = request.nextUrl;

  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding') || pathname.startsWith('/invite');

  if (isProtectedRoute) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Decode JWT payload to check expiry
      const payloadBase64 = token.split('.')[1];
      // Node/Edge environment standard base64 decoding
      const payloadDecoded = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const payload = JSON.parse(payloadDecoded);
      
      const isExpired = payload.exp * 1000 < Date.now();
      if (isExpired) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } catch (e) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();
  
  // Enforce search engine headers on protected directories
  if (pathname.startsWith('/dashboard')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/invite/:path*'],
};
