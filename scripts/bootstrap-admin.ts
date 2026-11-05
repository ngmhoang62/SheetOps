import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { backendTarget, deploymentStaging } from "../src/lib/environment";
import { loadStagingEnv } from "./staging-env";
if (process.env.APP_ENV === "staging") loadStagingEnv();
else loadEnvConfig(process.cwd());
// Run only from a trusted terminal. Create the Auth account in the dashboard first.
// No passwords, tokens or credential values are printed or accepted in command arguments.
async function main() {
  const target = z.uuid().parse(process.env.BOOTSTRAP_ADMIN_ID);
  const name = z
    .string()
    .trim()
    .min(1)
    .max(200)
    .parse(process.env.BOOTSTRAP_ADMIN_NAME);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  backendTarget(
    url,
    deploymentStaging(process.env),
    process.env.NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF,
  );
  if (!url) throw new Error("Missing target");
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Missing server key");
  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.admin.getUserById(target);
  if (error || !data.user.email) throw new Error("Auth account not found");
  const result = await db.rpc("bootstrap_admin", {
    target,
    full_name_input: name,
    email_input: data.user.email,
  });
  if (result.error)
    throw new Error(
      "Bootstrap rejected: check whether an active Admin already exists.",
    );
  console.log(
    "First Admin profile provisioned. Sign in with the password configured in Supabase Auth.",
  );
}
main().catch(() => {
  console.error(
    "Bootstrap failed. Verify target project, Auth user ID, name and whether an Admin already exists. No credentials were logged.",
  );
  process.exitCode = 1;
});
