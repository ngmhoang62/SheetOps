import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { backendTarget, deploymentStaging } from "../environment";
import { upstreamFetch } from "./transport";

export function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  backendTarget(
    url,
    deploymentStaging(process.env),
    process.env.NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF,
  );
  if (!url || !key)
    throw new Error("Supabase configuration unavailable or incorrect project");
  return { url, key };
}
export async function serverClient() {
  const { url, key } = publicConfig();
  const jar = await cookies();
  return createServerClient(url, key, {
    global: { fetch: upstreamFetch },
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Server component: proxy refreshes cookies. */
        }
      },
    },
  });
}
export function privilegedClient() {
  const { url } = publicConfig();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Server configuration unavailable");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
