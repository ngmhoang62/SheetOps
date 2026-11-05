import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { assertStaging, stagingSheet } from "../src/lib/environment";

/** Deliberately never load .env.local or inherit production integration secrets. */
export function loadStagingEnv() {
  const parsed = parseEnv(readFileSync(".env.staging.local", "utf8"));
  const production = existsSync(".env.local")
    ? parseEnv(readFileSync(".env.local", "utf8"))
    : {};
  validateDistinctSecrets(parsed, production);
  for (const key of [
    "APP_ENV",
    "NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF",
    "PRODUCTION_GOOGLE_SPREADSHEET_ID",
    "NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_PRIVATE_KEY",
    "GOOGLE_SPREADSHEET_ID",
    "STAGING_GOOGLE_SPREADSHEET_ID",
    "CRON_SECRET",
    "APP_ORIGIN",
  ]) {
    if (!parsed[key]) throw new Error(`Staging file missing ${key}`);
    process.env[key] = parsed[key];
  }
  for (const key of ["PREVIEW_ORIGIN", "PRODUCTION_APP_ORIGIN"]) {
    delete process.env[key];
    if (parsed[key]) process.env[key] = parsed[key];
  }
  for (const key of ["BOOTSTRAP_ADMIN_ID", "BOOTSTRAP_ADMIN_NAME"])
    if (parsed[key]) process.env[key] = parsed[key];
  assertStaging(process.env);
  stagingSheet(
    process.env.GOOGLE_SPREADSHEET_ID,
    process.env.STAGING_GOOGLE_SPREADSHEET_ID,
  );
}

export function validateDistinctSecrets(
  staging: Record<string, string | undefined>,
  production: Record<string, string | undefined>,
) {
  if (
    production.NEXT_PUBLIC_SUPABASE_URL &&
    staging.NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF &&
    new URL(production.NEXT_PUBLIC_SUPABASE_URL).hostname !==
      `${staging.NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`
  )
    throw new Error(
      "Production reference declaration does not match local production configuration",
    );
  if (
    production.GOOGLE_SPREADSHEET_ID &&
    staging.PRODUCTION_GOOGLE_SPREADSHEET_ID &&
    production.GOOGLE_SPREADSHEET_ID !==
      staging.PRODUCTION_GOOGLE_SPREADSHEET_ID
  )
    throw new Error(
      "Production spreadsheet declaration does not match local production configuration",
    );
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "GOOGLE_SPREADSHEET_ID",
    "SUPABASE_SECRET_KEY",
    "GOOGLE_PRIVATE_KEY",
    "CRON_SECRET",
  ]) {
    const normalize = (value: string | undefined) =>
      value?.replace(/\\n/g, "\n").trim();
    if (
      staging[key] &&
      production[key] &&
      normalize(staging[key]) === normalize(production[key])
    )
      throw new Error(`Independent staging credential required for ${key}`);
  }
}
