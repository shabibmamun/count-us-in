import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

const isMissingOrPlaceholder = (val: string | undefined) => {
  return !val || val.includes('placeholder') || val === '';
};

if (isProd) {
  if (isMissingOrPlaceholder(url) || isMissingOrPlaceholder(key) || isMissingOrPlaceholder(appUrl)) {
    throw new Error('CRITICAL CONFIGURATION ERROR: Mandatory production environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL) are missing or invalid.');
  }
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
