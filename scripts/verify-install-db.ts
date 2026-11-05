import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

let stage = "configuration";
// No environment files, cloud clients, published ports or host mounts.
// Auth fixtures model only the SQL contracts used by the committed migrations.
async function main() {
  if (process.env.RUN_INSTALL_DB_TEST !== "1")
    throw new Error("Explicit RUN_INSTALL_DB_TEST=1 required");
  const docker = (args: string[], input?: string) =>
    execFileSync("docker", args, {
      input,
      encoding: "utf8",
      timeout: 60000,
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 8 * 1024 * 1024,
    }).trim();
  let container: string | undefined;
  try {
    stage = "image_pull";
    // Cold-image progress must not be mistaken for the detached container ID.
    docker(["pull", "postgres:17-alpine"]);
    stage = "container_start";
    container = docker([
      "run",
      "--pull=never",
      "--rm",
      "-d",
      "--network",
      "none",
      "-e",
      "POSTGRES_HOST_AUTH_METHOD=trust",
      "postgres:17-alpine",
    ]);
    if (!/^[a-f0-9]{64}$/.test(container))
      throw new Error("Invalid container ID");
    stage = "database_ready";
    for (let i = 0; ; i++) {
      try {
        docker(["exec", container, "pg_isready", "-U", "postgres"]);
        break;
      } catch {
        if (i >= 30) throw new Error("Database startup timeout");
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    const sql = (query: string) =>
      docker(
        [
          "exec",
          "-i",
          container!,
          "psql",
          "-U",
          "postgres",
          "-d",
          "postgres",
          "-v",
          "ON_ERROR_STOP=1",
          "-At",
        ],
        query,
      );
    stage = "auth_fixture";
    sql(`create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      grant usage on schema auth to authenticated,service_role;
      grant execute on function auth.uid() to authenticated,service_role;`);
    const files = readdirSync("supabase/migrations")
      .filter((p) => p.endsWith(".sql"))
      .sort();
    for (const file of files) {
      stage = file;
      // Atomic per migration; fail on the first SQL error.
      sql(
        "begin;\n" +
          readFileSync("supabase/migrations/" + file, "utf8") +
          "\ncommit;",
      );
      console.log("Migration PASS: " + file);
    }
    stage = "schema_assertions";
    const assert = (query: string, expected: string) => {
      if (sql(query) !== expected) throw new Error("Database assertion failed");
    };
    assert("select count(*) from public.orders;", "0");
    assert(
      "select count(*) from pg_tables where schemaname='public' and rowsecurity and tablename in ('profiles','orders','sync_runs','audit_logs','workspace_settings');",
      "5",
    );
    const id = "00000000-0000-4000-8000-000000000001";
    sql(`insert into auth.users values('${id}'); set role service_role;
      select public.bootstrap_admin('${id}','Synthetic owner','owner@example.invalid'); reset role;`);
    assert("select role||':'||is_active from public.profiles;", "admin:true");
    assert(
      "select count(*) from public.audit_logs where resource_type='profiles';",
      "1",
    );
    let rejected = false;
    try {
      sql(
        `set role service_role; select public.bootstrap_admin('${id}','Again','owner@example.invalid');`,
      );
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error("Duplicate bootstrap was accepted");
    sql(`set role authenticated; set request.jwt.claim.sub='${id}';
      insert into public.orders(order_code,customer_name,order_date,status,total_amount)
      values('INSTALL-001','Synthetic customer','2026-01-15','completed',9007199254740993);
      reset role;`);
    assert("select total_amount::text from public.orders;", "9007199254740993");
    assert(
      "select count(*) from public.audit_logs where resource_type='orders';",
      "1",
    );
    // Exercise the alternate platform-helper branch without reapplying indexes.
    sql(`create function public.rls_auto_enable() returns event_trigger
      language plpgsql as $$ begin return; end $$;
      grant execute on function public.rls_auto_enable() to public,anon,authenticated;`);
    sql(
      readFileSync(
        "supabase/migrations/20261102085245_phase2_hardening.sql",
        "utf8",
      ).split("create index profiles_role_active")[0],
    );
    assert(
      "select has_function_privilege('anon','public.rls_auto_enable()','EXECUTE') or has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE');",
      "f",
    );
    console.log(
      "PASS: empty schema, all migrations, RLS, first Admin, bootstrap guard, exact BIGINT and transactional audit. Hosted Auth/Sheets/SMTP are not tested.",
    );
  } finally {
    if (container && /^[a-f0-9]{64}$/.test(container))
      docker(["stop", container]);
  }
}
main().catch((error: unknown) => {
  console.error(
    "Isolated installation DB test failed. Check Docker Server and migration SQL. No cloud resources accessed.",
  );
  // Every command uses only local synthetic SQL and no secrets or cloud config.
  console.error(
    JSON.stringify({
      stage,
      detail: String(
        (error as { stderr?: string })?.stderr ??
          (error instanceof Error ? error.message : "Unknown local error"),
      ).slice(0, 4000),
    }),
  );
  process.exitCode = 1;
});
