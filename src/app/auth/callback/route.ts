import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  // Prevent open redirect vulnerabilities
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  const response = NextResponse.redirect(new URL(safeNext, request.url));

  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && anonKey && !url.includes('placeholder')) {
      const supabase = createServerClient(url, anonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
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
        }
      } catch (e) {
        console.error('Session exchange error:', e);
      }
    }
  }

  // If code exchange fails, redirect to login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('error', 'auth-callback-failed');
  return NextResponse.redirect(loginUrl);
}
