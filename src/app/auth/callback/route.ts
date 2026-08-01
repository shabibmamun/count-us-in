import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  // Prevent open redirect vulnerabilities
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.session) {
        const response = NextResponse.redirect(new URL(safeNext, request.url));
        
        // Write standard cookies for server-side middleware checking
        response.cookies.set('sb-access-token', data.session.access_token, {
          path: '/',
          maxAge: data.session.expires_in,
          sameSite: 'lax',
          secure: true
        });
        response.cookies.set('sb-refresh-token', data.session.refresh_token, {
          path: '/',
          maxAge: 604800,
          sameSite: 'lax',
          secure: true
        });
        
        return response;
      }
    } catch (e) {
      console.error('Session exchange error:', e);
    }
  }

  // If code exchange fails, redirect to login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('error', 'auth-callback-failed');
  return NextResponse.redirect(loginUrl);
}
