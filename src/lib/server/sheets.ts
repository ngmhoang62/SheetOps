import "server-only";
import { google } from "googleapis";
import {
  outputHeaders,
  inputHeaders,
  normalizeRows,
  parseSheet,
  snapshotHash,
  stagingRequests,
  exportRows,
} from "@/lib/sheets-format";
import type { LiveOrder } from "@/lib/contracts";
import { privilegedClient } from "@/lib/supabase/server";
import { HttpError } from "./http";
import { stagingSheet, deploymentStaging } from "../environment";

function client() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!email || !key || !spreadsheetId)
    throw new HttpError(503, "Chưa cấu hình Google Sheets.");
  if (deploymentStaging(process.env))
    stagingSheet(spreadsheetId, process.env.STAGING_GOOGLE_SPREADSHEET_ID);
  else if (
    !process.env.PRODUCTION_GOOGLE_SPREADSHEET_ID ||
    spreadsheetId !== process.env.PRODUCTION_GOOGLE_SPREADSHEET_ID
  )
    throw new HttpError(503, "Cấu hình Spreadsheet không khớp môi trường.");
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return { sheets: google.sheets({ version: "v4", auth }), spreadsheetId };
}
const options = { timeout: 10000, retry: false };
async function retry<T>(operation: () => Promise<T>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const status =
        (error as { status?: number; code?: number }).status ??
        (error as { code?: number }).code;
      if (attempt >= 2 || ![429, 500, 502, 503, 504].includes(Number(status)))
        throw error;
      await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
    }
  }
}
export async function connection() {
  const { sheets, spreadsheetId } = client();
  const { data } = await retry(() =>
    sheets.spreadsheets.get(
      { spreadsheetId, fields: "sheets.properties" },
      options,
    ),
  );
  const tabs = data.sheets?.map((s) => s.properties?.title) ?? [];
  return {
    configured: true,
    tabs,
    sourcePresent: tabs.includes("Source_Orders"),
    requiredHeaders: inputHeaders,
  };
}
export async function previewImport() {
  const { sheets, spreadsheetId } = client();
  const { data } = await retry(() =>
    sheets.spreadsheets.values.get(
      {
        spreadsheetId,
        range: "'Source_Orders'!A1:G5002",
        valueRenderOption: "UNFORMATTED_VALUE",
      },
      options,
    ),
  );
  const rows = data.values ?? [];
  const parsed = parseSheet(rows);
  return { ...parsed, rowCount: parsed.orders.length };
}
export async function beginSync(
  job: "import" | "export",
  kind: "manual" | "cron",
  actor: string | null,
  key: string,
) {
  const { data, error } = await privilegedClient().rpc("begin_sync", {
    job,
    trigger_kind: kind,
    key_input: key,
    actor,
  });
  if (error) throw error;
  return data as {
    run: { id: string; status: string; started_at: string };
    acquired: boolean;
  };
}
export async function failRun(id: string, error: unknown) {
  const status = Number(
    (error as { status?: number; code?: number })?.status ??
      (error as { code?: number })?.code,
  );
  const message =
    error instanceof HttpError
      ? error.message
      : Number.isFinite(status)
        ? `External request failed (HTTP ${status})`
        : "Sync failed; check configuration, permissions, or source validation.";
  await privilegedClient()
    .from("sync_runs")
    .update({
      status: "failed",
      error_message: message,
      finished_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "running");
}
export async function exportSnapshot(
  kind: "manual" | "cron",
  actor: string | null,
  key: string,
  getClient: typeof client = client,
) {
  const started = await beginSync("export", kind, actor, key);
  if (!started.acquired) return { ...started, reused: true };
  const runId = started.run.id;
  const db = privilegedClient();
  let phase = "snapshot";
  try {
    const snapshot = await db.rpc("export_snapshot");
    if (snapshot.error) throw snapshot.error;
    const orders = snapshot.data as LiveOrder[];
    if (orders.length > 8000)
      throw new HttpError(
        413,
        "Bản xuất vượt giới hạn 8.000 dòng. Cần worker riêng.",
      );
    const rows = exportRows(orders);
    const hash = snapshotHash(rows);
    const { sheets, spreadsheetId } = getClient();
    phase = "metadata";
    const meta = await sheets.spreadsheets.get(
      { spreadsheetId, fields: "sheets.properties" },
      options,
    );
    let tabs = meta.data.sheets?.map((s) => s.properties!) ?? [];
    for (const name of ["Export_Staging", "Export_Orders"]) {
      if (!tabs.some((t) => t.title === name)) {
        await sheets.spreadsheets.batchUpdate(
          {
            spreadsheetId,
            requestBody: {
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: name,
                      gridProperties: {
                        rowCount: Math.max(1000, rows.length),
                        columnCount: 7,
                      },
                    },
                  },
                },
              ],
            },
          },
          options,
        );
      }
    }
    if (
      !["Export_Staging", "Export_Orders"].every((name) =>
        tabs.some((tab) => tab.title === name),
      )
    ) {
      const updated = await sheets.spreadsheets.get(
        { spreadsheetId, fields: "sheets.properties" },
        options,
      );
      tabs = updated.data.sheets?.map((s) => s.properties!) ?? [];
    }
    const stage = tabs.find((t) => t.title === "Export_Staging")!;
    const output = tabs.find((t) => t.title === "Export_Orders")!;
    const previous = await sheets.spreadsheets.values.get(
      { spreadsheetId, range: "'Export_Orders'!A1:G1" },
      options,
    );
    const header = previous.data.values?.[0];
    if (
      header?.length &&
      JSON.stringify(header) !== JSON.stringify(outputHeaders)
    )
      throw new HttpError(
        409,
        "Export_Orders có header không đúng. Không ghi đè bảng chưa xác định.",
      );
    phase = "staging-write";
    await retry(() =>
      sheets.spreadsheets.batchUpdate(
        {
          spreadsheetId,
          requestBody: {
            requests: stagingRequests(
              stage.sheetId!,
              rows,
              stage.gridProperties?.rowCount ?? undefined,
              stage.gridProperties?.columnCount ?? undefined,
            ),
          },
        },
        options,
      ),
    );
    phase = "staging-readback";
    const staged = await sheets.spreadsheets.values.get(
      {
        spreadsheetId,
        range: `'Export_Staging'!A1:G${rows.length}`,
        valueRenderOption: "UNFORMATTED_VALUE",
      },
      options,
    );
    if (snapshotHash(normalizeRows(staged.data.values ?? [], 7)) !== hash)
      throw new HttpError(
        502,
        "Kiểm chứng staging thất bại; giữ nguyên bản xuất trước.",
      );
    const lease = await db
      .from("sync_runs")
      .select("status,started_at")
      .eq("id", runId)
      .single();
    if (
      lease.error ||
      lease.data.status !== "running" ||
      Date.now() - Date.parse(lease.data.started_at) > 90_000
    )
      throw new HttpError(
        409,
        "Tác vụ vượt thời gian cho phép; không xuất bản.",
      );
    phase = "publish";
    // Atomic structural batch: clear output values and copy the fully verified staging snapshot.
    await sheets.spreadsheets.batchUpdate(
      {
        spreadsheetId,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: output.sheetId,
                  gridProperties: {
                    rowCount: Math.max(
                      rows.length,
                      output.gridProperties?.rowCount ?? 1000,
                    ),
                    columnCount: Math.max(
                      7,
                      output.gridProperties?.columnCount ?? 7,
                    ),
                  },
                },
                fields: "gridProperties",
              },
            },
            {
              repeatCell: {
                range: {
                  sheetId: output.sheetId,
                  startColumnIndex: 0,
                  endColumnIndex: 7,
                },
                cell: {},
                fields: "userEnteredValue",
              },
            },
            {
              copyPaste: {
                source: {
                  sheetId: stage.sheetId,
                  startRowIndex: 0,
                  endRowIndex: rows.length,
                  startColumnIndex: 0,
                  endColumnIndex: 7,
                },
                destination: {
                  sheetId: output.sheetId,
                  startRowIndex: 0,
                  endRowIndex: rows.length,
                  startColumnIndex: 0,
                  endColumnIndex: 7,
                },
                pasteType: "PASTE_VALUES",
              },
            },
          ],
        },
      },
      options,
    );
    phase = "published-readback";
    const published = await sheets.spreadsheets.values.get(
      {
        spreadsheetId,
        range: "'Export_Orders'!A:G",
        valueRenderOption: "UNFORMATTED_VALUE",
      },
      options,
    );
    if (snapshotHash(normalizeRows(published.data.values ?? [], 7)) !== hash)
      throw new HttpError(502, "Kiểm chứng bản xuất chưa thành công.");
    phase = "complete";
    const finished = await db.rpc("complete_export", {
      run_id: runId,
      count_input: orders.length,
      hash_input: hash,
    });
    if (finished.error) throw finished.error;
    return { runId, status: "success", rowCount: orders.length, hash };
  } catch (error) {
    const upstream = error as { code?: unknown; status?: unknown };
    const code = String(upstream.code ?? "UPSTREAM_FAILURE");
    console.warn(
      JSON.stringify({
        event: "export_failed",
        phase,
        code: /^[A-Z0-9_]{1,25}$/.test(code) ? code : "UPSTREAM_FAILURE",
        status: typeof upstream.status === "number" ? upstream.status : null,
      }),
    );
    await failRun(runId, error);
    throw error;
  }
}
