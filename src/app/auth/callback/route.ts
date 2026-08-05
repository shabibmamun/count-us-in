import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const errorParam = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  // Prevent open redirect vulnerabilities
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  if (errorParam) {
    console.error('OAuth error callback:', errorParam, errorDescription);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', `oauth-error: ${errorParam} (${errorDescription || 'no description'})`);
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'missing-authorization-code');
    return NextResponse.redirect(loginUrl);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes('placeholder')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', `invalid-env-config: url=${url ? 'present' : 'missing'} key=${anonKey ? 'present' : 'missing'}`);
    return NextResponse.redirect(loginUrl);
  }

  // Create a mutable redirect response to hold the cookies
  let response = NextResponse.redirect(new URL(safeNext, request.url));

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.redirect(new URL(safeNext, request.url));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    } else {
      console.error('exchangeCodeForSession error:', error);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', error.message || 'auth-callback-failed');
      return NextResponse.redirect(loginUrl);
    }
  } catch (e: any) {
    console.error('Session exchange error:', e);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', e.message || 'session-exchange-exception');
    return NextResponse.redirect(loginUrl);
  }
}
