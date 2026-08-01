import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fail-safe fallback to Vercel deployment URL or official production URL if not configured
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
               (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'https://count-us-in.vercel.app');

const isMissingOrPlaceholder = (val: string | undefined) => {
  return !val || val.includes('placeholder') || val === '';
};

if (isProd) {
  const missing = [];
  if (isMissingOrPlaceholder(url)) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (isMissingOrPlaceholder(key)) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (isMissingOrPlaceholder(appUrl)) missing.push('NEXT_PUBLIC_APP_URL');

  if (missing.length > 0) {
    throw new Error(`CRITICAL CONFIGURATION ERROR: Mandatory production environment variables are missing or invalid: ${missing.join(', ')}.`);
  }
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
