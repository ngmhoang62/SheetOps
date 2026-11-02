import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import {
  chromium,
  expect,
  type Browser,
  type BrowserContext,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { google } from "googleapis";
loadEnvConfig(process.cwd());
async function main() {
  if (process.env.RUN_CLOUD_TESTS !== "1")
    throw new Error("Explicit cloud test opt-in required");
  const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3001";
  if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
    throw new Error("Local test server required");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (new URL(url).hostname !== "ubaxgkqkfcrqbyshkidz.supabase.co")
    throw new Error("Wrong project");
  const service = createClient(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const initial = await service
    .from("orders")
    .select("id", { head: true, count: "exact" });
  if (initial.error || initial.count !== 0)
    throw new Error(
      "Requires empty database; existing data is never overwritten",
    );
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
  const backupTabs: { name: string; id: number; rows: string[][] }[] = [];
  const canonical = [
    "order_code",
    "customer_name",
    "order_date",
    "status",
    "total_amount",
    "note",
    "updated_at",
  ];
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });
  for (const name of ["Export_Orders", "Export_Staging"]) {
    const props = metadata.data.sheets?.find(
      (s) => s.properties?.title === name,
    )?.properties;
    if (props?.sheetId == null)
      throw new Error("Test requires existing application-managed tabs");
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'" + name + "'!A:G",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const rows = (read.data.values ?? []) as string[][];
    if (
      rows.length > 1 ||
      (rows.length === 1 &&
        JSON.stringify(rows[0]) !== JSON.stringify(canonical))
    )
      throw new Error(
        "Refuse to overwrite any existing output or staging content",
      );
    backupTabs.push({ name, id: props.sheetId, rows });
  }
  let browser: Browser | null = null;
  const users: { id: string; email: string; password: string; role: string }[] =
    [];
  const orderIds: string[] = [];
  const runIds: string[] = [];
  const results: { check: string; status: string }[] = [];
  let step = "initialization";
  const code = "E2E-" + randomUUID().slice(0, 8).toUpperCase();
  const pass = (check: string) => results.push({ check, status: "PASS" });
  async function login(
    context: BrowserContext,
    account: (typeof users)[number],
  ) {
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("response", async (r) => {
      if (
        r.url().includes("/api/auth/login") ||
        r.url().includes("/api/session")
      )
        console.log(
          JSON.stringify({
            path: new URL(r.url()).pathname,
            status: r.status(),
            error: !r.ok()
              ? await r
                  .json()
                  .then((v) => v.error?.message)
                  .catch(() => "unreadable")
              : undefined,
          }),
        );
    });
    await page.goto(base + "/login");
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Tổng quan hoạt động" }),
    ).toBeVisible();
    return page;
  }
  try {
    step = "provision test users";
    await service.auth.admin.listUsers({ page: 1, perPage: 1 });
    for (const role of ["admin", "editor", "viewer"]) {
      const email = `sheetops-e2e-${randomUUID()}@example.com`,
        password = randomUUID() + "Aa1!";
      const created = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (created.error) {
        console.log(
          JSON.stringify({
            authStatus: created.error.status,
            authCode: created.error.code,
            errorName: created.error.name,
          }),
        );
        throw new Error("Auth fixture unavailable");
      }
      users.push({ id: created.data.user.id, email, password, role });
      const p = await service.from("profiles").insert({
        id: created.data.user.id,
        full_name: `E2E ${role} (temporary)`,
        email,
        role,
        is_active: true,
      });
      if (p.error) throw new Error("Profile fixture unavailable");
    }
    browser = await chromium.launch({ channel: "chrome", headless: true });
    step = "Admin browser login";
    const adminContext = await browser.newContext();
    const admin = await login(adminContext, users[0]);
    pass("Admin browser login and protected dashboard");
    step = "anonymous and cron protection";
    const anonymous = await browser.newContext();
    expect((await anonymous.request.get(base + "/api/orders")).status()).toBe(
      401,
    );
    expect(
      (await anonymous.request.get(base + "/api/cron/daily-export")).status(),
    ).toBe(401);
    expect(
      (
        await anonymous.request.get(base + "/api/cron/daily-export", {
          headers: { Authorization: "Bearer invalid" },
        })
      ).status(),
    ).toBe(401);
    pass("Anonymous API and missing/wrong cron secret rejected");
    step = "browser CRUD";
    await admin.goto(base + "/orders");
    await admin
      .getByRole("button", { name: "Tạo đơn hàng", exact: true })
      .click();
    const dialog = admin.getByRole("dialog");
    await dialog.locator("#order-order_code").fill(code);
    await dialog.locator("#order-customer_name").fill("E2E fictional customer");
    await dialog.locator("#order-total_amount").fill("9007199254740993");
    await dialog.locator("#order-status").selectOption("completed");
    await dialog
      .getByRole("button", { name: "Tạo đơn hàng", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    const listing = await adminContext.request.get(
      base + "/api/orders?search=" + code,
    );
    expect(listing.status()).toBe(200);
    const saved = (await listing.json()).data.orders[0];
    expect(saved.total_amount).toBe("9007199254740993");
    orderIds.push(saved.id);
    pass("Browser order creation persisted with exact BIGINT");
    await admin.reload();
    await admin.getByLabel("Tìm kiếm đơn hàng").fill(code);
    await expect(
      admin.getByRole("button", { name: code, exact: true }),
    ).toBeVisible();
    pass("Order persists after refresh");
    await admin.goto(base + "/dashboard");
    await expect(admin.getByTestId("Tổng doanh thu")).toContainText(
      "9.007.199.254.740.993",
    );
    await admin.goto(base + "/reports");
    await expect(admin.getByTestId("Tổng doanh thu")).toContainText(
      "9.007.199.254.740.993",
    );
    pass("Dashboard and Reports SQL revenue match exact integer");
    await admin.goto(base + "/orders");
    await admin.getByLabel("Tìm kiếm đơn hàng").fill(code);
    await admin
      .getByRole("button", { name: "Sửa " + code, exact: true })
      .click();
    await dialog.locator("#order-total_amount").fill("2000000");
    await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(dialog).toHaveCount(0);
    const summary = await adminContext.request.get(
      base + "/api/dashboard/summary",
    );
    expect((await summary.json()).data.revenue).toBe("2000000");
    pass("Browser edit refreshes database aggregates");
    step = "Sheets connection and verified export";
    expect(
      (await adminContext.request.get(base + "/api/sync/connection")).status(),
    ).toBe(200);
    pass("Authenticated live Google Sheets connection");
    for (let i = 0; i < 2; i++) {
      const response = await adminContext.request.post(
        base + "/api/sync/export",
        { headers: { Origin: base }, timeout: 120000 },
      );
      expect(response.status()).toBe(200);
      const result = (await response.json()).data;
      runIds.push(result.runId);
      expect(result.rowCount).toBe(1);
    }
    const after = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Export_Orders'!A:G",
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    expect(after.data.values?.length).toBe(2);
    expect(after.data.values?.[1][0]).toBe(code);
    expect(String(after.data.values?.[1][4])).toBe("2000000");
    pass(
      "Two real staged/read-back exports produce one snapshot row without duplicates",
    );
    step = "Viewer and Editor HTTP authorization";
    const viewerContext = await browser.newContext();
    const viewer = await login(viewerContext, users[2]);
    await viewer.goto(base + "/orders");
    await expect(
      viewer.getByRole("button", { name: "Tạo đơn hàng", exact: true }),
    ).toHaveCount(0);
    expect(
      (
        await viewerContext.request.post(base + "/api/orders", {
          headers: { Origin: base },
          data: {},
        })
      ).status(),
    ).toBe(403);
    expect(
      (await viewerContext.request.get(base + "/api/users")).status(),
    ).toBe(403);
    const forbidden = await viewer.goto(base + "/users");
    expect(forbidden?.status()).toBe(403);
    pass("Viewer read-only UI, direct mutations and admin routes denied");
    const editorContext = await browser.newContext();
    await login(editorContext, users[1]);
    expect(
      (
        await editorContext.request.post(base + "/api/sync/export", {
          headers: { Origin: base },
        })
      ).status(),
    ).toBe(403);
    pass("Editor cannot invoke privileged sync API");
    step = "delete, audit, CSV and cron";
    await admin
      .getByRole("button", { name: "Xóa " + code, exact: true })
      .click();
    await admin
      .getByRole("dialog")
      .getByRole("button", { name: "Xóa đơn hàng", exact: true })
      .click();
    await expect(admin.getByRole("dialog")).toHaveCount(0);
    const audit = await adminContext.request.get(base + "/api/audit");
    expect(
      (await audit.json()).data.filter(
        (a: { resource_id: string }) => a.resource_id === saved.id,
      ).length,
    ).toBe(3);
    const csv = await adminContext.request.get(base + "/api/reports/export");
    expect(await csv.text()).not.toContain(code);
    pass("Confirmed soft delete, persisted audit and CSV exclusion");
    const cron = await anonymous.request.get(base + "/api/cron/daily-export", {
      headers: { Authorization: "Bearer " + process.env.CRON_SECRET },
      timeout: 120000,
    });
    expect(cron.status()).toBe(200);
    const cronResult = (await cron.json()).data;
    if (cronResult.runId) runIds.push(cronResult.runId);
    expect(cronResult.rowCount).toBe(0);
    const duplicate = await anonymous.request.get(
      base + "/api/cron/daily-export",
      { headers: { Authorization: "Bearer " + process.env.CRON_SECRET } },
    );
    expect((await duplicate.json()).data.reused).toBe(true);
    pass("Real authenticated cron invocation and same-day idempotency");
    const empty = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Export_Orders'!A:G",
    });
    expect(empty.data.values?.length).toBe(1);
    pass("Next verified snapshot excludes soft-deleted rows");
    const preview = await adminContext.request.post(
      base + "/api/sync/import/preview",
      { headers: { Origin: base } },
    );
    expect(preview.status()).toBe(200);
    const p = (await preview.json()).data;
    expect(p.rowCount).toBe(0);
    expect(p.canImport).toBe(false);
    pass(
      "Empty source validation and initial-import denial after soft deletion",
    );
    step = "final dashboard and logout";
    await admin.goto(base + "/dashboard");
    await expect(
      admin.getByRole("heading", { name: "Tổng quan hoạt động" }),
    ).toBeVisible();
    await mkdir("output/playwright", { recursive: true });
    await admin.screenshot({ path: "output/playwright/phase2-dashboard.png" });
    step = "logout menu";
    await admin.locator(".user-menu summary").click();
    await admin.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    step = "logout redirect";
    await admin.waitForURL("**/login");
    pass("Browser logout");
  } catch (error) {
    for (const c of browser?.contexts() ?? [])
      for (const p of c.pages()) {
        console.log(
          JSON.stringify({
            page: new URL(p.url()).pathname,
            text: (
              await p
                .locator("body")
                .innerText()
                .catch(() => "unavailable")
            ).slice(0, 1500),
          }),
        );
      }
    console.log(
      JSON.stringify({
        failureType: (error as Error).name,
        firstLine: (error as Error).message.split("\n")[0],
        httpStatus: (error as { status?: number }).status,
      }),
    );
    results.push({ check: step, status: "FAIL" });
    process.exitCode = 1;
  } finally {
    await browser?.close();
    // Restore both external tabs BEFORE deleting cloud fixtures. Never clear unrelated rows.
    let sheetsRestored = true;
    try {
      for (const backup of backupTabs) {
        const current = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "'" + backup.name + "'!A:G",
          valueRenderOption: "UNFORMATTED_VALUE",
        });
        const values = current.data.values ?? [];
        if (
          values.length &&
          JSON.stringify(values[0]) !== JSON.stringify(canonical)
        )
          throw new Error("Unexpected concurrent sheet edit");
        if (values.slice(1).some((row) => row[0] !== code))
          throw new Error("Unrelated sheet rows detected");
      }
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: backupTabs.flatMap((backup) => [
            {
              repeatCell: {
                range: {
                  sheetId: backup.id,
                  startColumnIndex: 0,
                  endColumnIndex: 7,
                },
                cell: {},
                fields: "userEnteredValue",
              },
            },
            ...(backup.rows.length
              ? [
                  {
                    updateCells: {
                      start: {
                        sheetId: backup.id,
                        rowIndex: 0,
                        columnIndex: 0,
                      },
                      rows: backup.rows.map((row) => ({
                        values: row.map((value) => ({
                          userEnteredValue: { stringValue: String(value) },
                        })),
                      })),
                      fields: "userEnteredValue",
                    },
                  },
                ]
              : []),
          ]),
        },
      });
      for (const backup of backupTabs) {
        const read = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "'" + backup.name + "'!A:G",
          valueRenderOption: "UNFORMATTED_VALUE",
        });
        expect(read.data.values ?? []).toEqual(backup.rows);
      }
      pass(
        "Both managed Sheets tabs restored and read-back matched pre-test content",
      );
    } catch {
      sheetsRestored = false;
      results.push({
        check:
          "External sheet restoration requires inspection; cloud fixtures retained",
        status: "FAIL",
      });
      process.exitCode = 1;
    }
    if (!sheetsRestored) {
      console.log(
        JSON.stringify(
          {
            results,
            sourceOrders: "untouched",
            cleanup:
              "Cloud fixtures retained because unexpected external content was detected",
          },
          null,
          2,
        ),
      );
      return;
    }
    const fixtures = await service
      .from("orders")
      .select("id")
      .eq("order_code", code);
    if (fixtures.data) orderIds.push(...fixtures.data.map((r) => r.id));
    if (orderIds.length)
      await service.from("orders").delete().in("id", orderIds);
    if (runIds.length) {
      await service.from("audit_logs").delete().in("resource_id", runIds);
      await service.from("sync_runs").delete().in("id", runIds);
    }
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await service.from("audit_logs").delete().in("actor_id", ids);
      await service.from("audit_logs").delete().in("resource_id", ids);
      await service.from("profiles").delete().in("id", ids);
      for (const id of ids) await service.auth.admin.deleteUser(id);
    }
    console.log(
      JSON.stringify(
        {
          results,
          cleanupScope: "Only fixture IDs created by this run",
          sourceOrders: "untouched",
        },
        null,
        2,
      ),
    );
  }
}
main().catch(() => {
  console.error(
    "E2E prerequisites failed. Check local server, empty database/output and test opt-in. No credentials logged.",
  );
  process.exitCode = 1;
});
