import { assertStaging, stagingSheet } from "../src/lib/environment";
import { loadStagingEnv } from "./staging-env";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
loadStagingEnv();
async function main() {
  if (process.env.RUN_CLOUD_TESTS !== "1")
    throw new Error("Explicit opt-in required");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  assertStaging(process.env);
  const db = createClient(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
  stagingSheet(spreadsheetId, process.env.STAGING_GOOGLE_SPREADSHEET_ID);
  // Actual Google credentials, deliberately read-only scope: the provider rejects writes with 403.
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const tabs = ["Source_Orders", "Export_Orders", "Export_Staging"];
  async function read() {
    const result = [];
    for (const tab of tabs) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${tab}'!A:G`,
      });
      result.push(response.data.values ?? []);
    }
    return result;
  }
  const before = await read();
  const count = await db
    .from("orders")
    .select("id", { count: "exact", head: true });
  assert.equal(count.error, null);
  const key = "failure-test:" + randomUUID();
  try {
    const { exportSnapshot } = await import("../src/lib/server/sheets");
    let failed = false;
    try {
      await exportSnapshot("cron", null, key, () => ({
        sheets,
        spreadsheetId,
      }));
    } catch {
      failed = true;
    }
    assert.equal(failed, true);
    const run = await db
      .from("sync_runs")
      .select("id,status,error_message")
      .eq("idempotency_key", key)
      .single();
    assert.equal(run.error, null);
    assert.equal(run.data!.status, "failed");
    assert.match(run.data!.error_message!, /403/);
    const afterCount = await db
      .from("orders")
      .select("id", { count: "exact", head: true });
    assert.equal(afterCount.count, count.count);
    assert.deepEqual(await read(), before);
    console.log(
      JSON.stringify(
        {
          providerFailure: "PASS: actual Google 403 with read-only scope",
          persistedFailureRun: "PASS",
          businessRowsUnchanged: "PASS",
          allThreeSheetTabsUnchanged: "PASS",
        },
        null,
        2,
      ),
    );
  } finally {
    await db.from("sync_runs").delete().eq("idempotency_key", key);
  }
}
main().catch(() => {
  console.error(
    "Sync-failure verification failed; no credentials logged. Inspect local setup and the isolated run key.",
  );
  process.exitCode = 1;
});
