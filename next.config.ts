import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fail-safe fallback to Vercel deployment URL or official production URL if not configured
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
               (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'https://count-us-in.vercel.app');

if (isProd) {
  const missing = [];
  
  if (!url) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL (is undefined/missing)');
  } else if (url.includes('placeholder') || url === '') {
    missing.push(`NEXT_PUBLIC_SUPABASE_URL (is template placeholder value: "${url}")`);
  }

  if (!key) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY (is undefined/missing)');
  } else if (key.includes('placeholder') || key === '') {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY (is template placeholder value)');
  }

  if (!appUrl) {
    missing.push('NEXT_PUBLIC_APP_URL (is undefined/missing)');
  } else if (appUrl.includes('placeholder') || appUrl === '') {
    missing.push('NEXT_PUBLIC_APP_URL (is template placeholder value)');
  }

  if (missing.length > 0) {
    throw new Error(`CRITICAL CONFIGURATION ERROR: Mandatory production environment variables are missing or invalid: ${missing.join(', ')}.`);
  }
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
