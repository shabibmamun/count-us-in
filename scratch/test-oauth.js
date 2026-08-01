const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in environment.');
  process.exit(1);
}

console.log('Testing Supabase URL:', url);
console.log('Testing Supabase Anon Key length:', key.length);

const supabase = createClient(url, key);

async function testOAuth() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://count-us-in.vercel.app/auth/callback',
      },
    });

    if (error) {
      console.error('Error during OAuth initialization:', error);
    } else {
      console.log('OAuth initialization SUCCESS!');
      console.log('Redirect URL:', data.url);
      
      if (data.url && data.url.includes('google.com')) {
        console.log('Google Auth URL generated successfully!');
      } else {
        console.warn('URL does not seem to contain Google OAuth link!');
      }
    }
  } catch (e) {
    console.error('Unexpected error:', e);
  }
}

testOAuth();
