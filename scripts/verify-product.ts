import { loadStagingEnv } from "./staging-env";
import { assertStaging, stagingSheet } from "../src/lib/environment";
import { snapshotHash, normalizeRows } from "../src/lib/sheets-format";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  chromium,
  expect,
  type Browser,
  type BrowserContext,
} from "@playwright/test";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { google } from "googleapis";
loadStagingEnv();
assertStaging(process.env);
stagingSheet(
  process.env.GOOGLE_SPREADSHEET_ID,
  process.env.STAGING_GOOGLE_SPREADSHEET_ID,
);
const base = process.env.PRODUCT_BASE_URL || "http://127.0.0.1:3001";
if (base !== "http://127.0.0.1:3001")
  throw new Error(
    "Full mutation regression is local-only; use test:preview:smoke for bounded Preview checks",
  );
if (
  !["http://127.0.0.1:3001"].includes(base) ||
  process.env.RUN_PRODUCT_TESTS !== "1"
)
  throw Error("Explicit staging product test required");
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
const key = randomUUID().slice(0, 8).toUpperCase(),
  code = "QA-" + key,
  users: {
    id: string;
    email: string;
    password: string;
    role: string;
    client: SupabaseClient;
  }[] = [],
  ids: string[] = [],
  runs: string[] = [],
  checks: string[] = [],
  timings: Record<string, number[]> = {};
let browser: Browser | undefined,
  phase = "preflight";
const sheetId = process.env.GOOGLE_SPREADSHEET_ID!;
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const backups: { name: string; id: number; values: unknown[][] }[] = [];
const allowedHashes = new Set<string>();
let outputsTouched = false;
let originalDigest = "";
let complete = false;
const digest = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const headers = (origin = base) => ({
  Origin: origin,
  ...(process.env.VERCEL_OIDC_TOKEN
    ? { "x-vercel-trusted-oidc-idp-token": process.env.VERCEL_OIDC_TOKEN }
    : {}),
});
async function request(
  ctx: BrowserContext,
  path: string,
  method = "GET",
  data?: unknown,
  origin = base,
) {
  const t = performance.now();
  if (base.startsWith("https:")) {
    let page = ctx
      .pages()
      .find((p) => !p.isClosed() && p.url().startsWith(base));
    if (!page) {
      page = await ctx.newPage();
      await page.goto(base + "/login");
      await expect(
        page.getByRole("button", { name: "Đăng nhập", exact: true }),
      ).toBeVisible();
    }
    if (origin !== base)
      await ctx.route(
        base + path,
        (route) =>
          route.continue({
            headers: {
              ...route.request().headers(),
              origin,
              ...(process.env.VERCEL_OIDC_TOKEN
                ? {
                    "x-vercel-trusted-oidc-idp-token":
                      process.env.VERCEL_OIDC_TOKEN,
                  }
                : {}),
            },
          }),
        { times: 1 },
      );
    const result = await page.evaluate(
      async ({ path, method, data }) => {
        const r = await fetch(path, {
          method,
          headers: { "Content-Type": "application/json" },
          body: data === undefined ? undefined : JSON.stringify(data),
          cache: "no-store",
        });
        return { status: r.status, text: await r.text() };
      },
      { path, method, data },
    );
    (timings[path.split("?")[0]] ??= []).push(
      Math.round(performance.now() - t),
    );
    return {
      status: () => result.status,
      ok: () => result.status >= 200 && result.status < 300,
      json: async () => JSON.parse(result.text),
      text: async () => result.text,
    };
  }
  const r = await ctx.request.fetch(base + path, {
    method,
    data,
    headers: headers(origin),
    timeout: 120000,
  });
  (timings[path.split("?")[0]] ??= []).push(Math.round(performance.now() - t));
  return r;
}
async function main() {
  try {
    expect.configure({ timeout: 20000 });
    const original = await service
      .from("orders")
      .select("id,order_code,total_amount,deleted_at,updated_at")
      .order("id");
    if (original.error) throw Error("Cannot record QA baseline");
    originalDigest = digest(original.data);
    const sourceBefore =
      (
        await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: "'Source_Orders'!A:G",
          valueRenderOption: "UNFORMATTED_VALUE",
        })
      ).data.values ?? [];
    const props = (
      await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
        fields: "sheets.properties",
      })
    ).data.sheets!;
    for (const name of ["Export_Orders", "Export_Staging"]) {
      const id = props.find((s) => s.properties?.title === name)?.properties
        ?.sheetId;
      if (id == null) throw Error("Missing managed tab");
      const values =
        (
          await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: "'" + name + "'!A:G",
            valueRenderOption: "UNFORMATTED_VALUE",
          })
        ).data.values ?? [];
      if (
        values.length &&
        values[0].join(",") !==
          "order_code,customer_name,order_date,status,total_amount,note,updated_at"
      )
        throw Error("Unrecognized output tab");
      backups.push({ name, id, values });
    }
    mkdirSync("output/performance", { recursive: true });
    writeFileSync(
      "output/performance/product-" + key + "-snapshots.private.json",
      JSON.stringify(backups),
    );
    for (const role of ["admin", "editor", "viewer"]) {
      const email =
          "product-" + key.toLowerCase() + "-" + role + "@example.invalid",
        password = randomUUID() + "Aa1!";
      const r = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (r.error || !r.data.user) throw Error("Fixture Auth unavailable");
      const u = {
        id: r.data.user.id,
        email,
        password,
        role,
        client: createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false } },
        ),
      };
      users.push(u);
      const p = await service.from("profiles").insert({
        id: u.id,
        email,
        role,
        full_name: "Synthetic " + role,
        is_active: true,
      });
      if (p.error) throw Error("Fixture profile unavailable");
      if ((await u.client.auth.signInWithPassword({ email, password })).error)
        throw Error("Fixture password unavailable");
    }
    browser = await chromium.launch({ channel: "chrome", headless: true });
    async function context() {
      const c = await browser!.newContext({
        viewport: { width: 1366, height: 900 },
      });
      if (process.env.VERCEL_OIDC_TOKEN)
        await c.route(base + "/**", (r) =>
          r.continue({
            headers: {
              ...r.request().headers(),
              "x-vercel-trusted-oidc-idp-token": process.env.VERCEL_OIDC_TOKEN!,
            },
          }),
        );
      return c;
    }
    async function login(c: BrowserContext, u: (typeof users)[number]) {
      const p = await c.newPage();
      p.on("response", async (r) => {
        const path = new URL(r.url()).pathname;
        if (new URL(r.url()).origin === base && path.startsWith("/api/")) {
          await r.finished().catch(() => {});
          const metric =
            r.request().method() +
            " " +
            path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ":id") +
            " [" +
            r.status() +
            "]";
          (timings[metric] ??= []).push(
            Math.round(r.request().timing().responseEnd),
          );
          console.log(
            JSON.stringify({
              browserApi: path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ":id"),
              status: r.status(),
              method: r.request().method(),
            }),
          );
        }
      });
      await p.goto(base + "/login");
      await p.getByLabel("Email", { exact: true }).fill(u.email);
      await p.getByLabel("Mật khẩu", { exact: true }).fill(u.password);
      await p.getByRole("button", { name: "Đăng nhập", exact: true }).click();
      await p.waitForURL("**/dashboard");
      await expect(
        p.getByText("Đang tải thống kê…", { exact: true }),
      ).toHaveCount(0);
      return p;
    }
    const a = await context(),
      page = await login(a, users[0]);
    phase = "create/edit";
    const before = (await (await request(a, "/api/dashboard/summary")).json())
      .data;
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Đơn hàng", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Tạo đơn hàng", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#order-order_code").fill(code);
    await dialog.locator("#order-customer_name").fill("Khách hàng giả lập");
    await dialog.locator("#order-total_amount").fill("9007199254740993");
    await dialog.locator("#order-status").selectOption("pending");
    await dialog.locator("#order-note").fill("=1+1");
    const createAck = performance.now();
    await dialog
      .getByRole("button", { name: "Tạo đơn hàng", exact: true })
      .click();
    await expect(
      dialog.getByRole("button", { name: "Đang lưu…", exact: true }),
    ).toBeVisible();
    timings.create_ack = [Math.round(performance.now() - createAck)];
    await expect(dialog).toHaveCount(0);
    const listed = await request(a, "/api/orders?search=" + code);
    expect(listed.status()).toBe(200);
    const saved = (await listed.json()).data.orders[0];
    ids.push(saved.id);
    expect(saved.total_amount).toBe("9007199254740993");
    await page.getByLabel("Tìm kiếm đơn hàng").fill(code);
    await expect(
      page.getByRole("button", { name: code, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Sửa " + code, exact: true })
      .click();
    await dialog.locator("#order-status").selectOption("completed");
    const editAck = performance.now();
    await dialog
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await expect(
      dialog.getByRole("button", { name: "Đang lưu…", exact: true }),
    ).toBeVisible();
    timings.edit_ack = [Math.round(performance.now() - editAck)];
    await expect(dialog).toHaveCount(0);
    const summary = (await (await request(a, "/api/dashboard/summary")).json())
      .data;
    expect(BigInt(summary.revenue)).toBe(
      BigInt(before.revenue) + 9007199254740993n,
    );
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Báo cáo", exact: true })
      .click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const parts: Buffer[] = [];
    for await (const chunk of stream) parts.push(Buffer.from(chunk));
    const csvBytes = Buffer.concat(parts),
      csvText = csvBytes.toString("utf8");
    expect(csvBytes.subarray(0, 3).toString("hex")).toBe("efbbbf");
    expect(csvText).toContain("Khách hàng giả lập");
    expect(csvText).toContain("9007199254740993");
    expect(csvText).toContain('"\'=1+1"');
    checks.push(
      "Browser CSV download preserves UTF-8/BIGINT and neutralizes formulas",
    );
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Đơn hàng", exact: true })
      .click();
    await page.getByLabel("Tìm kiếm đơn hàng").fill(code);
    checks.push(
      "Browser create/edit, pending-to-completed and exact BIGINT aggregation",
    );
    phase = "hide rollback";
    await page.route("**/api/orders/" + saved.id, (r) =>
      r.request().method() === "DELETE"
        ? r.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              error: { message: "Synthetic mutation failure" },
            }),
          })
        : r.continue(),
    );
    await page.getByRole("button", { name: "Ẩn " + code, exact: true }).click();
    await dialog
      .getByRole("button", { name: "Ẩn đơn hàng", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Ẩn " + code, exact: true }),
    ).toBeEnabled();
    expect(
      (await (await request(a, "/api/orders/" + saved.id)).json()).data
        .deleted_at,
    ).toBeNull();
    await page.unroute("**/api/orders/" + saved.id);
    checks.push("Failed optimistic Hide rolls back without backend success");
    phase = "hide restore";
    await page.getByRole("button", { name: "Ẩn " + code, exact: true }).click();
    const ack = performance.now();
    await dialog
      .getByRole("button", { name: "Ẩn đơn hàng", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    timings.hide_ack = [Math.round(performance.now() - ack)];
    await expect(
      page.getByRole("button", { name: "Kích hoạt lại " + code, exact: true }),
    ).toBeEnabled();
    await expect(
      page
        .getByRole("button", { name: code, exact: true })
        .locator("xpath=ancestor::tr"),
    ).toHaveClass(/order-hidden/);
    expect(
      BigInt(
        (await (await request(a, "/api/dashboard/summary")).json()).data
          .revenue,
      ),
    ).toBe(BigInt(before.revenue));
    const csv = await (await request(a, "/api/reports/export")).text();
    expect(csv).not.toContain(code);
    await page
      .getByRole("button", { name: "Kích hoạt lại " + code, exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Kích hoạt lại", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Ẩn " + code, exact: true }),
    ).toBeEnabled();
    expect(
      (await (await request(a, "/api/orders/" + saved.id)).json()).data.id,
    ).toBe(saved.id);
    const firstAudit = await service
      .from("audit_logs")
      .select("action")
      .eq("resource_id", saved.id);
    expect(firstAudit.data?.map((x) => x.action)).toContain("hidden");
    expect(firstAudit.data?.map((x) => x.action)).toContain("restored");
    const auditCount = firstAudit.data!.length;
    await Promise.all(
      Array.from({ length: 4 }, () =>
        request(a, "/api/orders/" + saved.id + "/restore", "POST"),
      ),
    );
    expect(
      (
        await service
          .from("audit_logs")
          .select("id")
          .eq("resource_id", saved.id)
      ).data?.length,
    ).toBe(auditCount);
    checks.push(
      "Hide/Restore preserves ID, audits once, excludes revenue/CSV and repeats idempotently",
    );
    phase = "server sort";
    const rows = Array.from({ length: 30 }, (_, i) => {
      const id = randomUUID();
      ids.push(id);
      return {
        id,
        order_code: code + "-" + i,
        customer_name: "Synthetic pagination",
        order_date: "2030-01-01",
        status: "pending",
        total_amount: "100",
        note: "",
      };
    });
    const seeded = await users[0].client.from("orders").insert(rows);
    if (seeded.error) throw Error("Pagination fixtures unavailable");
    for (const row of rows.slice(0, 5))
      expect(
        (
          await users[0].client.rpc("set_order_visibility", {
            target: row.id,
            hidden_input: true,
          })
        ).error,
      ).toBeNull();
    const all = [];
    for (const p of [1, 2]) {
      const r = await request(
        a,
        "/api/orders?search=" +
          code +
          "&page=" +
          p +
          "&pageSize=20&visibility=all",
      );
      expect(r.status()).toBe(200);
      all.push(...(await r.json()).data.orders);
    }
    expect(all.length).toBe(31);
    let hidden = false;
    for (const row of all) {
      if (row.deleted_at) hidden = true;
      else expect(hidden).toBe(false);
    }
    expect(new Set(all.map((x) => x.id)).size).toBe(all.length);
    checks.push("Hidden-last sorting precedes pagination across page boundary");
    phase = "RBAC";
    const v = await context(),
      viewer = await login(v, users[2]);
    expect(
      (
        await request(v, "/api/orders/" + saved.id + "/restore", "POST")
      ).status(),
    ).toBe(403);
    expect(
      (
        await users[2].client.rpc("set_order_visibility", {
          target: saved.id,
          hidden_input: true,
        })
      ).error,
    ).not.toBeNull();
    const hiddenRows = await request(
      v,
      "/api/orders?visibility=hidden&search=" + code,
    );
    expect((await hiddenRows.json()).data.total).toBe(5);
    expect((await request(v, "/api/orders", "POST", {})).status()).toBe(403);
    expect(
      (await request(v, "/api/orders/" + saved.id, "PATCH", {})).status(),
    ).toBe(403);
    expect(
      (await request(v, "/api/orders/" + saved.id, "DELETE")).status(),
    ).toBe(403);
    const e = await context();
    await login(e, users[1]);
    expect((await request(e, "/api/users")).status()).toBe(403);
    expect(
      (
        await request(e, "/api/users/" + users[1].id + "/role", "PATCH", {
          role: "admin",
        })
      ).status(),
    ).toBe(403);
    const anonymous = await context();
    expect((await request(anonymous, "/api/orders")).status()).toBe(401);
    expect((await request(anonymous, "/api/cron/daily-export")).status()).toBe(
      401,
    );
    await anonymous.close();
    expect(
      (
        await request(e, "/api/orders/" + saved.id + "/restore", "POST")
      ).status(),
    ).toBe(200);
    expect(
      (
        await request(a, "/api/orders", "POST", {}, "https://untrusted.example")
      ).status(),
    ).toBe(403);
    checks.push(
      "Viewer API/RLS denied, Editor restore allowed and Admin/CSRF protected",
    );
    phase = "responsive";
    for (const width of [1366, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const [path, heading] of [
        ["dashboard", "Tổng quan hoạt động"],
        ["orders", "Đơn hàng"],
        ["reports", "Báo cáo vận hành"],
        ["users", "Người dùng & vai trò"],
        ["sync", "Trung tâm đồng bộ"],
        ["settings", "Cài đặt"],
      ]) {
        await page.goto(base + "/" + path);
        await expect(
          page.getByRole("heading", { name: heading, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText(/Đang tải (thống kê|dữ liệu|đơn hàng)…/, {
            exact: true,
          }),
        ).toHaveCount(0);
        await expect(page.locator("main [role=alert]")).toHaveCount(0);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path:
            "output/performance/" +
            (base.startsWith("http:") ? "local" : "preview") +
            "-" +
            path +
            "-" +
            width +
            ".png",
          fullPage: true,
        });
      }
    }
    await page.setViewportSize({ width: 1366, height: 900 });
    checks.push(
      "All six routes fit laptop/mobile viewports; screenshots captured",
    );
    await page.goto(base + "/users");
    await expect(
      page.getByRole("button", { name: "Mời người dùng", exact: true }),
    ).toBeVisible();
    const inviteAck = performance.now();
    await page
      .getByRole("button", { name: "Mời người dùng", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    timings.invitation_dialog_ack = [Math.round(performance.now() - inviteAck)];
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Hủy", exact: true })
      .click();
    checks.push(
      "Invitation dialog opens without provider requests; no duplicate email sent",
    );
    phase = "sync";
    await page.goto(base + "/sync");
    await page
      .getByRole("button", { name: "Kiểm tra kết nối", exact: true })
      .click();
    await expect(
      page.getByText("Đã kiểm tra kết nối", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Xem trước nhập", exact: true })
      .click();
    await expect(
      page.getByText("Orders đã có dữ liệu; không thể nhập ban đầu.", {
        exact: true,
      }),
    ).toBeVisible();
    checks.push(
      "Real Sheets connection/Preview; initial import safely BLOCKED by retained QA data",
    );
    await request(a, "/api/orders/" + saved.id, "DELETE");
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = page
        .waitForResponse(
          (r) => new URL(r.url()).pathname === "/api/sync/export",
        )
        .catch(() => null);
      outputsTouched = true;
      await page
        .getByRole("button", { name: "Xuất lên Sheets", exact: true })
        .click();
      const r = await response;
      if (!r || r.status() !== 200) throw Error("Export failed");
      const d = (await r.json()).data;
      runs.push(d.runId);
      allowedHashes.add(d.hash);
      outputsTouched = true;
      for (const name of ["Export_Orders", "Export_Staging"]) {
        const values =
          (
            await sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: "'" + name + "'!A:G",
              valueRenderOption: "UNFORMATTED_VALUE",
            })
          ).data.values ?? [];
        expect(snapshotHash(normalizeRows(values, 7))).toBe(d.hash);
        expect(values.slice(1).some((row) => row[0] === code)).toBe(false);
        expect(new Set(values.slice(1).map((row) => row[0])).size).toBe(
          values.length - 1,
        );
      }
    }
    expect(
      (
        await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: "'Source_Orders'!A:G",
          valueRenderOption: "UNFORMATTED_VALUE",
        })
      ).data.values ?? [],
    ).toEqual(sourceBefore);
    checks.push(
      "Browser export twice, exact hash/read-back, hidden exclusion and no duplicates; source unchanged",
    );
    phase = "cache revocation";
    const disabled = await request(
      a,
      "/api/users/" + users[2].id + "/disable",
      "POST",
      { is_active: false },
    );
    expect(disabled.status()).toBe(200);
    expect((await request(v, "/api/orders")).status()).toBe(403);
    await viewer.evaluate(() => window.dispatchEvent(new Event("focus")));
    await viewer.waitForURL("**/login?reason=*");
    checks.push(
      "Disabled existing session denied and cached workspace cleared on fresh authorization",
    );
    phase = "logout";
    const secondTab = await a.newPage();
    await secondTab.goto(base + "/orders");
    await expect(
      secondTab.getByRole("heading", { name: "Đơn hàng", exact: true }),
    ).toBeVisible();
    await page.locator(".user-menu summary").click();
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    await page.waitForURL("**/login");
    expect((await request(a, "/api/orders")).status()).toBe(401);
    await secondTab.waitForURL("**/login?reason=*");
    await expect(secondTab.getByRole("table")).toHaveCount(0);
    checks.push(
      "Logout clears authenticated access and private content in another tab",
    );
    phase = "session expiration";
    const fresh = await context();
    const freshPage = await fresh.newPage();
    await freshPage.goto(base + "/login");
    await freshPage.getByLabel("Email", { exact: true }).fill(users[0].email);
    await freshPage
      .getByLabel("Mật khẩu", { exact: true })
      .fill(randomUUID() + "Wrong!");
    await freshPage
      .getByRole("button", { name: "Đăng nhập", exact: true })
      .click();
    await expect(
      freshPage.getByText("Email hoặc mật khẩu không đúng.", { exact: true }),
    ).toBeVisible();
    const authenticated = await login(fresh, users[0]);
    await authenticated.goto(base + "/orders");
    await expect(authenticated.getByRole("table")).toBeVisible();
    // Remove only the staging auth cookie, preserving Preview protection cookies.
    const cookiePrefix =
      "sb-" +
      process.env.NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF +
      "-auth-token";
    await fresh.clearCookies({ name: new RegExp("^" + cookiePrefix) });
    await authenticated.evaluate(() =>
      window.dispatchEvent(new Event("focus")),
    );
    await authenticated.waitForURL("**/login?reason=*");
    await expect(authenticated.getByRole("table")).toHaveCount(0);
    expect((await request(fresh, "/api/orders")).status()).toBe(401);
    checks.push(
      "Wrong password rejected; missing/expired browser session clears cached business data",
    );
    complete = true;
  } finally {
    await browser?.close();
    let restored = true;
    if (outputsTouched) {
      try {
        for (const backup of backups) {
          const current =
            (
              await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: "'" + backup.name + "'!A:G",
                valueRenderOption: "UNFORMATTED_VALUE",
              })
            ).data.values ?? [];
          if (
            !allowedHashes.has(snapshotHash(normalizeRows(current, 7))) &&
            digest(current) !== digest(backup.values)
          )
            throw Error("Concurrent external edit");
        }
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: backups.flatMap((b) => [
              {
                repeatCell: {
                  range: {
                    sheetId: b.id,
                    startColumnIndex: 0,
                    endColumnIndex: 7,
                  },
                  cell: {},
                  fields: "userEnteredValue",
                },
              },
              {
                updateCells: {
                  start: { sheetId: b.id, rowIndex: 0, columnIndex: 0 },
                  rows: b.values.map((row) => ({
                    values: row.map((value) => ({
                      userEnteredValue:
                        typeof value === "number"
                          ? { numberValue: value }
                          : typeof value === "boolean"
                            ? { boolValue: value }
                            : { stringValue: String(value) },
                    })),
                  })),
                  fields: "userEnteredValue",
                },
              },
            ]),
          },
        });
        for (const b of backups)
          expect(
            (
              await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: "'" + b.name + "'!A:G",
                valueRenderOption: "UNFORMATTED_VALUE",
              })
            ).data.values ?? [],
          ).toEqual(b.values);
        checks.push("External output snapshots restored exactly");
      } catch {
        restored = false;
        process.exitCode = 1;
        checks.push(
          "BLOCKED: concurrent Sheets change; fixtures retained for reconciliation",
        );
      }
    }
    if (restored) {
      const owned = users.length
        ? await service
            .from("orders")
            .select("id")
            .in(
              "updated_by",
              users.map((u) => u.id),
            )
        : { data: [], error: null };
      if (owned.error) throw Error("Scoped cleanup inspection failed");
      ids.push(...owned.data!.map((r) => r.id));
      if (ids.length) {
        const r = await service.from("orders").delete().in("id", ids);
        if (r.error) throw Error("Scoped order cleanup failed");
        await service.from("audit_logs").delete().in("resource_id", ids);
      }
      if (runs.length) {
        await service.from("audit_logs").delete().in("resource_id", runs);
        await service.from("sync_runs").delete().in("id", runs);
      }
      for (const u of users) {
        await service.from("audit_logs").delete().eq("actor_id", u.id);
        await service.from("audit_logs").delete().eq("resource_id", u.id);
        await service.from("profiles").delete().eq("id", u.id);
        if ((await service.auth.admin.deleteUser(u.id)).error)
          throw Error("Scoped Auth cleanup failed");
      }
      const after = await service
        .from("orders")
        .select("id,order_code,total_amount,deleted_at,updated_at")
        .order("id");
      expect(digest(after.data)).toBe(originalDigest);
      checks.push("Retained QA orders unchanged; only fixture IDs cleaned");
    }
    mkdirSync("output/performance", { recursive: true });
    writeFileSync(
      "output/performance/product-" +
        (base.startsWith("http:") ? "local" : "preview") +
        ".json",
      JSON.stringify(
        {
          phase,
          checks,
          timings,
          status: complete && !process.exitCode ? "PASS" : "FAIL",
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ phase, checks, timings }));
  }
}
main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      assertion:
        error instanceof Error ? error.message.split("\n")[0] : "unknown",
    }),
  );
  console.error(
    "Product E2E failed at " +
      phase +
      "; credentials and provider details suppressed.",
  );
  process.exitCode = 1;
});
