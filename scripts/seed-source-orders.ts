import { loadEnvConfig } from "@next/env";
import { google } from "googleapis";
import { pathToFileURL } from "node:url";
import { generateOrders } from "../src/lib/seed";
import { loadStagingEnv } from "./staging-env";
import { assertStaging, stagingSheet } from "../src/lib/environment";
import { inputHeaders, parseSheet } from "../src/lib/sheets-format";

class SeedError extends Error {}

export function sampleRows(): string[][] {
  const rows = [
    [...inputHeaders],
    ...generateOrders().map((order) =>
      inputHeaders.map((key) => String(order[key as keyof typeof order] ?? "")),
    ),
  ];
  const parsed = parseSheet(rows);
  if (parsed.errors.length || parsed.orders.length !== 300)
    throw new SeedError("Generated sample failed import validation.");
  return rows;
}

export function sourceState(rows: unknown[][], expected = sampleRows()) {
  if (JSON.stringify(rows[0]) !== JSON.stringify(inputHeaders))
    throw new SeedError(
      "Source header does not match the exact six-column template.",
    );
  if (rows.length === 1) return "empty";
  // Compare original cells, not a padded/truncated view: extra cells, formulas,
  // numeric amounts and additional rows must never be accepted as our sample.
  if (JSON.stringify(rows) !== JSON.stringify(expected))
    throw new SeedError(
      "Source contains other data. Refusing to overwrite any cells.",
    );
  const parsed = parseSheet(rows);
  if (parsed.errors.length || parsed.orders.length !== 300)
    throw new SeedError("Source read-back failed import validation.");
  return "seeded";
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.length === 1 && args[0] === "--confirm-development-source";
  const check = args.length === 1 && args[0] === "--check";
  if (!write && !check)
    throw new SeedError(
      "Opt-in required: use --check (read only) or --confirm-development-source (development spreadsheet only).",
    );
  if (write) loadStagingEnv();
  else loadEnvConfig(process.cwd());
  if (write) {
    assertStaging(process.env);
    stagingSheet(
      process.env.GOOGLE_SPREADSHEET_ID,
      process.env.STAGING_GOOGLE_SPREADSHEET_ID,
    );
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!email || !key || !spreadsheetId)
    throw new SeedError(
      "Missing Google service account or spreadsheet configuration.",
    );
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const options = { timeout: 20000, retry: false };
  const expected = sampleRows();
  let phase = "metadata";
  try {
    const metadata = await sheets.spreadsheets.get(
      { spreadsheetId, fields: "spreadsheetId,sheets.properties" },
      options,
    );
    if (metadata.data.spreadsheetId !== spreadsheetId)
      throw new SeedError(
        "Spreadsheet ID does not match the configured environment.",
      );
    const source = metadata.data.sheets?.find(
      (sheet) => sheet.properties?.title === "Source_Orders",
    );
    if (!source) throw new SeedError("Source_Orders does not exist.");
    const read = async () => {
      const result = await sheets.spreadsheets.values.get(
        {
          spreadsheetId,
          range: "'Source_Orders'",
          valueRenderOption: "FORMULA",
        },
        options,
      );
      return result.data.values ?? [];
    };
    phase = "source inspection";
    const state = sourceState(await read(), expected);
    console.log(JSON.stringify({ spreadsheetId, tab: "Source_Orders", state }));
    if (state === "seeded") {
      console.log(
        "NO-OP: exact 300-order sample verified; no writes performed.",
      );
      return;
    }
    if (check) {
      console.log("CHECK: canonical header only; no writes performed.");
      return;
    }
    if ((source.properties?.gridProperties?.rowCount ?? 0) < expected.length)
      throw new SeedError(
        "Source needs at least 301 existing rows; no changes made.",
      );
    // Repeat the guard immediately before the only write. Sheets values.update
    // has no compare-and-swap: do not edit Source concurrently with this script.
    if (sourceState(await read(), expected) !== "empty")
      throw new SeedError(
        "Source changed during inspection; rerun to verify safely.",
      );
    phase = "source write";
    await sheets.spreadsheets.values.update(
      {
        spreadsheetId,
        range: "'Source_Orders'!A2:F301",
        valueInputOption: "RAW",
        requestBody: { majorDimension: "ROWS", values: expected.slice(1) },
      },
      options,
    );
    phase = "read-back verification";
    if (sourceState(await read(), expected) !== "seeded")
      throw new SeedError(
        "Read-back is incomplete; inspect Source before retrying.",
      );
    console.log(
      "PASS: wrote and verified exactly 300 orders, 300 unique codes, valid ISO dates, exact Unicode/string amounts, six columns and no extra rows.",
    );
  } catch (error) {
    const api = error as {
      response?: {
        status?: number;
        data?: { error?: { status?: string; errors?: { reason?: string }[] } };
      };
    };
    if (api.response) {
      // Never print Google error objects: request configs contain credentials.
      const status = api.response.status;
      const reasons = api.response.data?.error?.errors
        ?.map((e) => e.reason)
        .filter((r) => r && /^[A-Za-z_]+$/.test(r))
        .join(",");
      throw new SeedError(
        `Google API failed during ${phase}: HTTP ${status ?? "unknown"}${reasons ? ` (${reasons})` : ""}. ` +
          (status === 403
            ? "Sheets write scope is configured; verify the configured service-account email privately, Editor sharing, API enablement and Source protected ranges. No OAuth fallback attempted."
            : "No automatic write retry or cleanup performed; rerun --check to inspect the current state."),
      );
    }
    if (error instanceof SeedError) throw error;
    throw new SeedError(
      `Operation failed during ${phase}; credentials and API details were suppressed. Rerun --check before writing again.`,
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error: unknown) => {
    console.error(
      error instanceof SeedError
        ? error.message
        : "Seed failed; credential and API details were suppressed.",
    );
    process.exitCode = 1;
  });
