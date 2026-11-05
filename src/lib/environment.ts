/** Deployment identities are explicit configuration, never account constants. */
export function projectRef(value: string | undefined) {
  if (!value || !/^[a-z]{20}$/.test(value))
    throw new Error("Explicit Supabase project reference required");
  return value;
}
export function backendTarget(
  url: string | undefined,
  staging: boolean,
  ref?: string,
  production = process.env.NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF,
) {
  const prod = projectRef(production);
  const target = staging ? projectRef(ref) : prod;
  if (!url) throw new Error("Backend configuration missing");
  const parsed = new URL(url);
  if (
    (staging && target === prod) ||
    (!staging && ref) ||
    parsed.protocol !== "https:" ||
    parsed.hostname !== target + ".supabase.co" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  )
    throw new Error("Backend environment isolation check failed");
  return parsed.origin;
}
export function deploymentStaging(env: Record<string, string | undefined>) {
  if (!["production", "staging"].includes(env.APP_ENV ?? ""))
    throw new Error("Explicit APP_ENV=production or staging required");
  if (
    (env.VERCEL_ENV === "preview" && env.APP_ENV !== "staging") ||
    (env.VERCEL_ENV === "production" && env.APP_ENV !== "production")
  )
    throw new Error("Deployment environment mismatch");
  return env.APP_ENV === "staging";
}
export function stagingSheet(
  id: string | undefined,
  expected: string | undefined,
  production = process.env.PRODUCTION_GOOGLE_SPREADSHEET_ID,
) {
  if (!production || !id || !expected || id === production || id !== expected)
    throw new Error("Independent staging spreadsheet required");
}
export function assertStaging(env: Record<string, string | undefined>) {
  if (env.APP_ENV !== "staging")
    throw new Error("Tests require explicit APP_ENV=staging");
  backendTarget(
    env.NEXT_PUBLIC_SUPABASE_URL,
    true,
    env.NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF,
    env.NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF,
  );
}
