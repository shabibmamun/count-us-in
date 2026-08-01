import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url.includes('placeholder') || !anonKey || anonKey.includes('placeholder')) {
    // Fail closed
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'connection-failed');
    return { supabaseResponse: NextResponse.redirect(loginUrl), user: null };
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Securely fetch authoritative auth user (not from cached session claims alone)
  const { data: { user } } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
