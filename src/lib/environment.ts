export const productionRef = "ubaxgkqkfcrqbyshkidz";
export const productionSheet = "1yPu5_CbUjLXQKJwnyIV7VWVAN2kUEj-aiEtAlEX3cug";
const retiredRef = "mkobuvmadimunvfgzzuy";
export function backendTarget(
  url: string | undefined,
  staging: boolean,
  ref?: string,
) {
  if (!url) throw new Error("Backend configuration missing");
  const parsed = new URL(url);
  const target = staging ? ref : productionRef;
  if (
    !target ||
    !/^[a-z]{20}$/.test(target) ||
    target === retiredRef ||
    (staging && target === productionRef) ||
    parsed.protocol !== "https:" ||
    parsed.hostname !== `${target}.supabase.co` ||
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
export function stagingSheet(
  id: string | undefined,
  expected: string | undefined,
) {
  if (!id || !expected || id === productionSheet || id !== expected)
    throw new Error("Independent staging spreadsheet required");
}
export function assertStaging(env: Record<string, string | undefined>) {
  if (env.APP_ENV !== "staging")
    throw new Error("Tests require explicit APP_ENV=staging");
  backendTarget(
    env.NEXT_PUBLIC_SUPABASE_URL,
    true,
    env.NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF,
  );
}
