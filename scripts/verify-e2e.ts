import { assertStaging, stagingSheet } from "../src/lib/environment";
import { loadStagingEnv } from "./staging-env";
import { generateOrders } from "../src/lib/seed";
import {
  inputHeaders,
  normalizeRows,
  parseSheet,
  snapshotHash,
} from "../src/lib/sheets-format";
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
loadStagingEnv();
async function main() {
  if (process.env.RUN_CLOUD_TESTS !== "1")
    throw new Error("Explicit cloud test opt-in required");
  const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3001";
  if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
    throw new Error("Local test server required");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  assertStaging(process.env);
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
  stagingSheet(spreadsheetId, process.env.STAGING_GOOGLE_SPREADSHEET_ID);
  const backupTabs: { name: string; id: number; rows: string[][] }[] = [];
  const sourceBefore = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'Source_Orders'!A:G",
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const sourceRows = sourceBefore.data.values ?? [];
  const sourceParsed = parseSheet(sourceRows);
  if (
    sourceParsed.errors.length &&
    !(
      sourceRows.length === 1 &&
      JSON.stringify(sourceRows[0]) === JSON.stringify(inputHeaders)
    )
  )
    throw new Error(
      "Staging source must be header-only or a valid synthetic source",
    );
  const expectedBusiness = [
    inputHeaders,
    ...generateOrders().map((o) =>
      inputHeaders.map((k) => String(o[k as keyof typeof o] ?? "")),
    ),
  ];
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
    const knownSynthetic =
      rows.length === 301 &&
      rows.every((r) => r.length === 7) &&
      JSON.stringify(rows[0]) === JSON.stringify(canonical) &&
      snapshotHash(normalizeRows(rows, 6)) === snapshotHash(expectedBusiness) &&
      rows
        .slice(1)
        .every(
          (r) => typeof r[6] === "string" && Number.isFinite(Date.parse(r[6])),
        );
    if (
      (rows.length > 1 && !knownSynthetic) ||
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
  expect.configure({ timeout: 15000 });
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
        r.url().includes("/api/session") ||
        r.url().includes("/api/dashboard/summary")
      )
        console.log(
          JSON.stringify({
            path: new URL(r.url()).pathname,
            status: r.status(),
            responseStartMs: Math.round(r.request().timing().responseStart),
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
    let sessionRequests = 0;
    page.on("request", (r) => {
      if (new URL(r.url()).pathname === "/api/session") sessionRequests++;
    });
    const started = performance.now();
    const summary = page
      .waitForResponse(
        (r) => r.url().includes("/api/dashboard/summary") && r.ok(),
      )
      .catch(() => null);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Tổng quan hoạt động" }),
    ).toBeVisible();
    await summary;
    await expect(
      page.getByText("Đang tải thống kê…", { exact: true }),
    ).toHaveCount(0);
    expect(sessionRequests).toBe(0);
    console.log(
      JSON.stringify({
        metric: "login_to_loaded_dashboard_ms",
        role: account.role,
        value: Math.round(performance.now() - started),
        sessionRequestsAfterSubmit: sessionRequests,
      }),
    );
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
    if (JSON.stringify(sourceRows) !== JSON.stringify(expectedBusiness))
      throw new Error(
        "Full import timing requires exact deterministic synthetic Source_Orders",
      );
    await admin.goto(base + "/sync");
    for (const width of [1366, 390]) {
      await admin.setViewportSize({ width, height: 844 });
      await expect(
        admin.getByRole("button", { name: "Xem trước nhập", exact: true }),
      ).toBeVisible();
      expect(
        await admin.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await admin.setViewportSize({ width: 1366, height: 844 });
    await admin
      .getByRole("button", { name: "Xem trước nhập", exact: true })
      .click();
    await admin
      .getByRole("button", { name: "Xác nhận nhập 300 đơn", exact: true })
      .click();
    const importedResponse = admin.waitForResponse(
      (r) => new URL(r.url()).pathname === "/api/sync/import/confirm",
    );
    await admin
      .getByRole("dialog")
      .getByRole("button", { name: "Xác nhận", exact: true })
      .click();
    const imported = await importedResponse;
    expect(imported.status()).toBe(200);
    const importedResult = (await imported.json()).data;
    runIds.push(importedResult.runId);
    expect(importedResult.rowCount).toBe(300);
    const fixtureImport = await service
      .from("orders")
      .select("id,order_code")
      .in(
        "order_code",
        generateOrders().map((o) => o.order_code),
      );
    if (fixtureImport.error) throw fixtureImport.error;
    orderIds.push(...fixtureImport.data.map((o) => o.id));
    expect(fixtureImport.data.length).toBe(300);
    pass(
      "Browser Preview and Confirm import exactly 300 deterministic staging orders; Sync fits laptop/mobile",
    );
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const [label, endpoint] of [
        ["Đơn hàng", "/api/orders"],
        ["Báo cáo", "/api/dashboard/summary"],
        ["Tổng quan", "/api/dashboard/summary"],
      ]) {
        const started = performance.now();
        const response = admin.waitForResponse(
          (r) => new URL(r.url()).pathname === endpoint && r.ok(),
        );
        await admin
          .getByRole("navigation", { name: "Điều hướng chính" })
          .getByRole("link", { name: label, exact: true })
          .click();
        const loaded = await response;
        await loaded.finished();
        await expect(
          admin.getByText(/Đang tải (thống kê|dữ liệu)…/, { exact: true }),
        ).toHaveCount(0);
        console.log(
          JSON.stringify({
            metric: "sidebar_to_data_ms",
            page: label,
            cycle,
            value: Math.round(performance.now() - started),
          }),
        );
      }
    }
    for (const width of [1366, 390]) {
      await admin.setViewportSize({ width, height: 844 });
      await expect(admin.locator(".demo-note")).toHaveCount(0);
      expect(
        await admin.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (width === 390) {
        await admin.getByRole("button", { name: "Mở điều hướng" }).click();
        await expect(
          admin.getByRole("navigation", { name: "Điều hướng chính" }),
        ).toBeVisible();
        await admin.getByRole("button", { name: "Đóng điều hướng" }).click();
      }
    }
    await admin.setViewportSize({ width: 1366, height: 844 });
    pass(
      "Laptop/mobile dashboard fits viewport and removed sidebar note stays absent",
    );
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
    // Remove only this run's imported fixture IDs before retained single-order assertions.
    const removedImport = await service
      .from("orders")
      .delete()
      .in("id", orderIds);
    if (removedImport.error) throw removedImport.error;
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
    step = "disabled Viewer session redirect";
    const disabled = await adminContext.request.post(
      base + `/api/users/${users[2].id}/disable`,
      {
        headers: { Origin: base },
        data: { is_active: false },
      },
    );
    expect(disabled.status()).toBe(200);
    await viewer.goto(base + "/orders");
    await expect(viewer).toHaveURL(
      /\/login\?reason=account_(disabled|unavailable)$/,
    );
    await expect(viewer.locator(".notice[role=alert]")).toContainText(
      "đã bị vô hiệu hóa",
    );
    expect(
      (await viewerContext.request.get(base + "/api/orders")).status(),
    ).toBe(401);
    pass(
      "Admin disables Viewer; existing browser session clears and redirects to explained login",
    );
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
      .getByRole("button", { name: "Ẩn " + code, exact: true })
      .click();
    await admin
      .getByRole("dialog")
      .getByRole("button", { name: "Ẩn đơn hàng", exact: true })
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
    expect(p.rowCount).toBe(sourceParsed.orders.length);
    expect(p.canImport).toBe(false);
    pass("Source preview and initial-import denial after soft deletion");
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
        if (JSON.stringify(values) === JSON.stringify(backup.rows)) continue;
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
      const sourceAfter = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Source_Orders'!A:G",
        valueRenderOption: "UNFORMATTED_VALUE",
      });
      expect(sourceAfter.data.values ?? []).toEqual(sourceRows);
      pass("Source content unchanged by read-back comparison");
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
    const ids = users.map((u) => u.id);
    if (ids.length) {
      const owned = await service
        .from("orders")
        .select("id")
        .in("updated_by", ids);
      if (owned.error) throw new Error("Cannot verify scoped fixture cleanup");
      orderIds.push(...owned.data.map((row) => row.id));
    }
    const checkedCleanup = async (
      operation: PromiseLike<{ error: unknown }>,
    ) => {
      const result = await operation;
      if (result.error) {
        results.push({
          check:
            "Fixture cleanup incomplete; inspect retained synthetic fixtures",
          status: "FAIL",
        });
        process.exitCode = 1;
      }
    };
    const fixtures = await service
      .from("orders")
      .select("id")
      .eq("order_code", code);
    if (fixtures.data) orderIds.push(...fixtures.data.map((r) => r.id));
    if (orderIds.length)
      await checkedCleanup(service.from("orders").delete().in("id", orderIds));
    if (runIds.length) {
      await checkedCleanup(
        service.from("audit_logs").delete().in("resource_id", runIds),
      );
      await checkedCleanup(service.from("sync_runs").delete().in("id", runIds));
    }
    if (ids.length) {
      await checkedCleanup(
        service.from("audit_logs").delete().in("actor_id", ids),
      );
      await checkedCleanup(
        service.from("audit_logs").delete().in("resource_id", ids),
      );
      await checkedCleanup(service.from("profiles").delete().in("id", ids));
      for (const id of ids)
        await checkedCleanup(service.auth.admin.deleteUser(id));
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
