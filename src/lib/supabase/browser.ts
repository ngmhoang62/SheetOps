"use client";
import { createBrowserClient } from "@supabase/ssr";
import { backendTarget } from "../environment";
export function browserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ref = process.env.NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF;
  backendTarget(
    url,
    !!ref,
    ref,
    process.env.NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF,
  );

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
