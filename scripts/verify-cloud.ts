import { assertStaging } from "../src/lib/environment";
import { loadStagingEnv } from "./staging-env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
loadStagingEnv();
// Opt-in real-cloud checks. Only generated fixture IDs are ever cleaned up.
// Do not run against a project with real business data; there is no automatic seed.
async function main() {
  if (process.env.RUN_CLOUD_TESTS !== "1")
    throw new Error("Set RUN_CLOUD_TESTS=1 explicitly");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  assertStaging(process.env);
  const service = createClient(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const existing = await service
    .from("orders")
    .select("id", { count: "exact", head: true });
  if (existing.error || existing.count !== 0)
    throw new Error(
      "Cloud test requires empty orders; no existing data will be changed",
    );
  const ids: string[] = [];
  const orderIds: string[] = [];
  const importIds: string[] = [];
  const runIds: string[] = [];
  const results: { check: string; status: string }[] = [];
  const clients: Partial<
    Record<"admin" | "editor" | "viewer", SupabaseClient>
  > = {};
  function assert(check: string, passed: boolean) {
    results.push({ check, status: passed ? "PASS" : "FAIL" });
    if (!passed) throw new Error(check);
  }
  try {
    const anonymous = createClient(url, publicKey, {
      auth: { persistSession: false },
    });
    const anon = await anonymous.from("orders_api").select("id");
    assert("Anonymous business reads denied", !!anon.error);
    for (const role of ["admin", "editor", "viewer"] as const) {
      const email = `sheetops-test-${randomUUID()}@example.com`;
      const password = randomUUID() + randomUUID().slice(0, 16) + "A!2";
      const created = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (created.error) {
        console.log(
          JSON.stringify({
            provisioningStatus: created.error.status,
            provisioningCode: created.error.code,
          }),
        );
        throw new Error("Test Auth provisioning failed");
      }
      const id = created.data.user.id;
      ids.push(id);
      const profile = await service.from("profiles").insert({
        id,
        full_name: "Integration fixture (temporary)",
        email,
        role,
        is_active: true,
      });
      if (profile.error) throw new Error("Test profile provisioning failed");
      const client = createClient(url, publicKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const login = await client.auth.signInWithPassword({ email, password });
      if (login.error)
        console.log(
          JSON.stringify({
            loginStatus: login.error.status,
            loginCode: login.error.code,
            errorName: login.error.name,
          }),
        );
      assert(`${role}: Supabase password authentication`, !login.error);
      clients[role] = client;
    }
    const importCode = "IMPORT-" + randomUUID().slice(0, 8).toUpperCase();
    const batch = [
      {
        order_code: importCode,
        customer_name: "Temporary import fixture",
        order_date: "2026-11-02",
        status: "completed",
        total_amount: "1234",
        note: "Temporary fixture",
      },
    ];
    const run = await service.rpc("begin_sync", {
      job: "import",
      trigger_kind: "manual",
      key_input: "integration:" + randomUUID(),
      actor: ids[0],
    });
    if (run.error) throw new Error("Cannot create import fixture run");
    runIds.push(run.data.run.id);
    const invalid = await clients.admin!.rpc("import_orders", {
      rows_input: [
        ...batch,
        { ...batch[0], order_code: importCode + "-BAD", total_amount: "-1" },
      ],
      run_id: run.data.run.id,
      hash_input: "fixture",
    });
    const afterInvalid = await service
      .from("orders")
      .select("id", { head: true, count: "exact" });
    assert(
      "Invalid import rolls back entire database batch",
      !!invalid.error && afterInvalid.count === 0,
    );
    const imported = await clients.admin!.rpc("import_orders", {
      rows_input: batch,
      run_id: run.data.run.id,
      hash_input: "fixture",
    });
    assert(
      "Atomic database import transaction",
      !imported.error && imported.data === 1,
    );
    const fixtureRows = await service
      .from("orders")
      .select("id")
      .eq("order_code", importCode);
    if (fixtureRows.error) throw new Error("Cannot inspect import fixture");
    importIds.push(...fixtureRows.data.map((r) => r.id));
    const eligible = await clients.admin!.rpc("can_import");
    assert(
      "Repeated initial import rejected when database populated",
      !eligible.error && eligible.data === false,
    );
    await service.from("orders").delete().in("id", importIds);
    const input = {
      order_code: "TEST-" + randomUUID().slice(0, 12).toUpperCase(),
      customer_name: "Temporary integration fixture",
      order_date: "2026-11-02",
      status: "completed",
      total_amount: "9007199254740993",
      note: "Temporary test data; cleaned by exact ID",
    };
    const viewer = await clients.viewer!.from("orders").insert(input);
    assert("Viewer create denied by RLS", !!viewer.error);
    const created = await clients
      .editor!.from("orders")
      .insert(input)
      .select("id")
      .single();
    assert("Editor PostgreSQL create", !created.error && !!created.data);
    orderIds.push(created.data!.id);
    const read = await clients
      .viewer!.from("orders_api")
      .select("*")
      .eq("id", orderIds[0])
      .single();
    assert(
      "Viewer read and exact BIGINT serialization",
      !read.error && read.data.total_amount === input.total_amount,
    );
    const report = await clients.viewer!.rpc("analytics_summary");
    assert(
      "SQL revenue exact above JS safe integer",
      !report.error && report.data.revenue === input.total_amount,
    );
    const forbidden = await clients
      .viewer!.from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderIds[0])
      .select("id");
    assert(
      "Viewer update denied",
      !!forbidden.error || forbidden.data?.length === 0,
    );
    const changed = await clients
      .editor!.from("orders")
      .update({ total_amount: "1234567" })
      .eq("id", orderIds[0])
      .select("id");
    assert(
      "Editor PostgreSQL edit",
      !changed.error && changed.data?.length === 1,
    );
    const elevated = await clients
      .viewer!.from("profiles")
      .update({ role: "admin" })
      .eq("id", ids[2]);
    assert("Self elevation denied", !!elevated.error);
    const adminApi = await clients.editor!.rpc("manage_profile", {
      target: ids[2],
      full_name_input: "fixture",
      email_input: "ignored@example.com",
      role_input: "admin",
      active_input: true,
    });
    assert("Editor Admin RPC denied", !!adminApi.error);
    const self = await clients.admin!.rpc("manage_profile", {
      target: ids[0],
      full_name_input: "fixture",
      email_input: "ignored@example.com",
      role_input: "viewer",
      active_input: false,
    });
    assert("Admin self-demotion rejected", !!self.error);
    const disabled = await service
      .from("profiles")
      .update({ is_active: false })
      .eq("id", ids[1]);
    if (disabled.error) throw new Error("Cannot disable fixture");
    const revoked = await clients.editor!.from("orders_api").select("id");
    assert(
      "Disabled user's existing session loses read access",
      !revoked.error && revoked.data?.length === 0,
    );
    await service.from("profiles").update({ is_active: true }).eq("id", ids[1]);
    const removed = await clients.editor!.rpc("soft_delete_order", {
      target: orderIds[0],
    });
    assert("Editor soft deletion", !removed.error);
    const totals = await clients.viewer!.rpc("analytics_summary");
    assert(
      "Soft deleted rows excluded from aggregates",
      !totals.error && totals.data.total === 0 && totals.data.revenue === "0",
    );
    const audit = await clients
      .admin!.from("audit_logs")
      .select("action")
      .eq("resource_id", orderIds[0]);
    assert(
      "Transactional order auditing",
      !audit.error && audit.data.length === 3,
    );
    const key = "integration:" + randomUUID();
    const first = await service.rpc("begin_sync", {
      job: "export",
      trigger_kind: "manual",
      key_input: key,
      actor: ids[0],
    });
    if (first.error) throw new Error("Cannot acquire sync fixture");
    runIds.push(first.data.run.id);
    const duplicate = await service.rpc("begin_sync", {
      job: "export",
      trigger_kind: "manual",
      key_input: key,
      actor: ids[0],
    });
    assert(
      "Sync idempotency reuses run",
      !duplicate.error && !duplicate.data.acquired,
    );
    const concurrent = await service.rpc("begin_sync", {
      job: "export",
      trigger_kind: "manual",
      key_input: "integration:" + randomUUID(),
      actor: ids[0],
    });
    assert("Concurrent sync rejected", !!concurrent.error);
  } finally {
    // Scope every cleanup by identifiers created by this invocation, including soft-deleted fixtures.
    if (orderIds.length || importIds.length)
      await service
        .from("orders")
        .delete()
        .in("id", [...orderIds, ...importIds]);
    if (runIds.length)
      await service.from("sync_runs").delete().in("id", runIds);
    if (ids.length) {
      await service.from("audit_logs").delete().in("actor_id", ids);
      await service.from("audit_logs").delete().in("resource_id", ids);
      await service.from("profiles").delete().in("id", ids);
      for (const id of ids) await service.auth.admin.deleteUser(id);
    }
    console.log(JSON.stringify({ results, fixturesCleaned: true }, null, 2));
  }
}
main().catch(() => {
  console.error(
    "Cloud checks failed; inspect PASS/FAIL summary and fixture cleanup. Credentials were not logged.",
  );
  process.exitCode = 1;
});
