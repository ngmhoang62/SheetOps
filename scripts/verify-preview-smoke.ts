import { loadStagingEnv } from "./staging-env";
import { assertStaging } from "../src/lib/environment";
import { createClient } from "@supabase/supabase-js";
import {
  chromium,
  expect as baseExpect,
  type Browser,
  type Page,
} from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  lockPreview,
  PreviewTraffic,
  previewOrigin as onlineOrigin,
} from "./preview-traffic";

loadStagingEnv();
assertStaging(process.env);
if (process.env.RUN_PREVIEW_SMOKE !== "1")
  throw Error("Explicit Preview smoke opt-in required");
const target = process.env.SMOKE_TARGET ?? "preview";
const annotations = process.env.SMOKE_SCOPE === "annotations";
if (process.env.SMOKE_SCOPE && !annotations)
  throw Error("Unsupported smoke scope");
if (!["preview", "local"].includes(target))
  throw Error("Unsupported smoke target");
const targetOrigin =
  target === "local" ? "http://127.0.0.1:3001" : onlineOrigin();
const reportName =
  (target === "local" ? "local-paced-smoke" : "preview-smoke") +
  (annotations ? "-annotations" : "");

const traffic = new PreviewTraffic();
const expect = baseExpect.configure({ timeout: 90000 });
const responses: { path: string; status: number }[] = [];
const checks: string[] = [];
const result: {
  status: string;
  phase: string;
  reason?: string;
  httpStatus?: number;
  checks: string[];
  intentionalPacing: boolean;
  traffic: typeof traffic.stats;
  retainedDataUnchanged?: boolean;
  timeoutMs?: number;
  failurePath?: string;
} = {
  status: "FAIL",
  phase: "access",
  checks,
  intentionalPacing: true,
  traffic: traffic.stats,
};
const hash = (data: unknown) =>
  createHash("sha256").update(JSON.stringify(data)).digest("hex");
async function main() {
  const unlock = lockPreview();
  let browser: Browser | undefined,
    activePage: Page | undefined,
    userId = "",
    baseline: { orders: string; runs: string; profiles: string } | undefined;
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  async function snapshot() {
    const orders = await db
      .from("orders")
      .select("id,order_code,total_amount,deleted_at,updated_at")
      .order("id");
    const runs = await db
      .from("sync_runs")
      .select("id,status,row_count,snapshot_hash")
      .order("id");
    const profiles = await db
      .from("profiles")
      .select("id,role,is_active,updated_at")
      .order("id");
    if (orders.error || runs.error || profiles.error)
      throw Error("Read-back unavailable");
    return {
      orders: hash(orders.data),
      runs: hash(runs.data),
      profiles: hash(profiles.data),
    };
  }
  const stopIfBlocked = () => {
    if (traffic.blocked) throw Error(traffic.blocked);
  };
  const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 2000));
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
    });
    traffic.focusRoute("/login");
    await traffic.attach(
      context,
      target === "preview" ? process.env.VERCEL_OIDC_TOKEN : undefined,
      targetOrigin,
    );
    const page = await context.newPage();
    activePage = page;
    page.on("response", (r) => {
      if (new URL(r.url()).origin === targetOrigin)
        responses.push({ path: new URL(r.url()).pathname, status: r.status() });
    });
    page.setDefaultTimeout(90000);
    const access = await page.goto(targetOrigin + "/login", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    result.httpStatus = access?.status();
    if (access?.headers()["x-vercel-mitigated"] === "challenge")
      traffic.stop("VERCEL_SECURITY_CHECKPOINT");
    stopIfBlocked();
    if (new URL(page.url()).origin !== targetOrigin) {
      result.status = "BLOCKED";
      result.reason = "DEPLOYMENT_AUTHENTICATION";
      return;
    }
    if (!access?.ok()) {
      result.status = "BLOCKED";
      result.reason = "PREVIEW_ACCESS_HTTP_" + access?.status();
      return;
    }
    await expect(
      page.getByRole("button", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
    checks.push("Login form accessible");
    // No fixture is created if the platform rejects the access probe.
    result.phase = "fixture";
    baseline = await snapshot();
    const active = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);
    if (active.error || active.count === null)
      throw Error("Active count unavailable");
    const expectedActive = String(active.count);
    const email = "preview-smoke-" + randomUUID() + "@example.invalid",
      password = randomUUID() + "Aa1!";
    const created = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user)
      throw Error("Fixture Auth unavailable");
    userId = created.data.user.id;
    const profile = await db.from("profiles").insert({
      id: userId,
      email,
      full_name: "Synthetic Preview smoke Admin",
      role: "admin",
      is_active: true,
    });
    if (profile.error) throw Error("Fixture profile unavailable");
    result.phase = "login";
    traffic.focusRoute("/dashboard");
    await pause();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.waitForURL("**/dashboard");
    stopIfBlocked();
    await expect(page.getByTestId("Tổng đơn hàng")).toHaveText(expectedActive);
    checks.push(
      "Password login and Dashboard match current active-order count",
    );
    for (const [label, heading, path] of [
      ["Đơn hàng", "Đơn hàng", "/orders"],
      ["Báo cáo", "Báo cáo vận hành", "/reports"],
      annotations
        ? ["Cài đặt", "Cài đặt", "/settings"]
        : ["Đồng bộ dữ liệu", "Trung tâm đồng bộ", "/sync"],
    ]) {
      result.phase = "read:" + label;
      traffic.focusRoute(path);
      await pause();
      stopIfBlocked();
      await page
        .getByRole("navigation", { name: "Điều hướng chính" })
        .getByRole("link", { name: label, exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(/Đang tải (thống kê|dữ liệu|đơn hàng|nhật ký)…/, {
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(page.locator("main [role=alert]")).toHaveCount(0);
      stopIfBlocked();
      if (label === "Đơn hàng") {
        await expect(page.locator("tbody tr")).toHaveCount(20);
        if (annotations) {
          expect(
            (await page.getByLabel("Lọc trạng thái").boundingBox())!.width,
          ).toBeLessThanOrEqual(240);
          await pause();
          await page.getByLabel("Lọc trạng thái").selectOption("hidden");
          await expect(page.locator("tbody tr").first()).toContainText("Đã ẩn");
          checks.push(
            "Compact unified Hidden filter returns retained hidden order",
          );
        }
      }
      if (label === "Báo cáo") {
        await expect(page.getByTestId("Tổng đơn hàng")).toHaveText(
          expectedActive,
        );
        if (annotations) {
          const panels = page.locator(".report-tables > section");
          expect((await panels.nth(1).boundingBox())!.height).toBeLessThan(
            (await panels.nth(0).boundingBox())!.height - 100,
          );
          checks.push(
            "Report summary does not stretch to monthly table height",
          );
        }
      }
      if (annotations && label === "Cài đặt") {
        const audit = page.locator(".audit-panel");
        await expect(audit.locator("tbody tr")).toHaveCount(50);
        await expect(
          audit.getByRole("columnheader", { name: "Vai trò", exact: true }),
        ).toBeVisible();
        await expect(
          audit.getByRole("columnheader", {
            name: "Mã đối tượng",
            exact: true,
          }),
        ).toHaveCount(0);
        expect(await audit.locator("tbody").innerText()).not.toMatch(
          /[0-9a-f]{8}-[0-9a-f-]{27,}/,
        );
        checks.push(
          "Live audit RPC renders 50 named actors/roles and human targets without UUID column",
        );
      }
      checks.push("Loaded page: " + label);
    }
    if (!annotations) {
      result.phase = "sheets-read";
      await pause();
      await page
        .getByRole("button", { name: "Kiểm tra kết nối", exact: true })
        .click();
      await expect(
        page.getByText("Đã kiểm tra kết nối", { exact: true }),
      ).toBeVisible();
      stopIfBlocked();
      await pause();
      await page
        .getByRole("button", { name: "Xem trước nhập", exact: true })
        .click();
      await expect(
        page.getByText("Orders đã có dữ liệu; không thể nhập ban đầu.", {
          exact: true,
        }),
      ).toBeVisible();
      stopIfBlocked();
      checks.push(
        "Sheets connection and Preview Import read; populated-table guard visible",
      );
    }
    result.phase = "csv";
    await pause();
    const csv = await page.evaluate(async () => {
      const response = await fetch("/api/reports/export", {
        cache: "no-store",
      });
      const bytes = new Uint8Array(await response.arrayBuffer());
      return {
        status: response.status,
        bom: Array.from(bytes.slice(0, 3)),
        header: new TextDecoder().decode(bytes).split("\r\n")[0],
      };
    });
    stopIfBlocked();
    expect(csv.status).toBe(200);
    expect(csv.bom).toEqual([239, 187, 191]);
    expect(csv.header).toContain("order_code,customer_name");
    checks.push("Read-only CSV response with UTF-8 BOM");
    result.phase = "logout";
    traffic.focusRoute("/login");
    await pause();
    await page.locator(".user-menu summary").click();
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    await page.waitForURL(
      (url) => url.origin === targetOrigin && url.pathname === "/login",
    );
    stopIfBlocked();
    checks.push("Logout returns to login");
    result.status = "PASS";
  } catch (error) {
    result.status = traffic.blocked ? "BLOCKED" : "FAIL";
    result.reason =
      traffic.blocked ??
      (error instanceof Error
        ? error.message.split("\n")[0]
        : "SMOKE_ASSERTION");
    if (error instanceof Error) {
      const timeout = error.message.match(/Timeout: (\d+)ms/);
      if (timeout) result.timeoutMs = Number(timeout[1]);
    }
  } finally {
    if (
      result.status === "FAIL" &&
      activePage &&
      new URL(activePage.url()).origin === targetOrigin
    ) {
      result.failurePath = new URL(activePage.url()).pathname;
      await activePage
        .screenshot({
          path: "output/performance/preview-smoke-failure.png",
          fullPage: true,
        })
        .catch(() => {});
    }
    await browser?.close();
    try {
      if (userId) {
        const audit = await db
          .from("audit_logs")
          .delete()
          .or("actor_id.eq." + userId + ",resource_id.eq." + userId);
        const profile = await db.from("profiles").delete().eq("id", userId);
        const user = await db.auth.admin.deleteUser(userId);
        if (audit.error || profile.error || user.error)
          throw Error("Scoped smoke cleanup incomplete");
      }
      if (baseline) {
        expect(await snapshot()).toEqual(baseline);
        result.retainedDataUnchanged = true;
      }
    } catch {
      result.status = "FAIL";
      result.reason = "SCOPED_CLEANUP_OR_READBACK_FAILED";
    }
    unlock();
    mkdirSync("output/performance", { recursive: true });
    const report = {
      attemptedAt: new Date().toISOString(),
      target,
      measurement: "Paced functional smoke, not a product-latency benchmark",
      concurrencyScope:
        "Controlled API bodies, asset bodies and route headers; excludes streamed route bodies",
      ...result,
      responses,
    };
    writeFileSync(
      "output/performance/" + reportName + ".json",
      JSON.stringify(report, null, 2),
    );
    writeFileSync(
      "output/performance/" + reportName + "-" + Date.now() + ".json",
      JSON.stringify(report, null, 2),
    );
    console.log(
      JSON.stringify({ attemptedAt: report.attemptedAt, target, ...result }),
    );
    if (result.status !== "PASS") process.exitCode = 1;
  }
}
main().catch(() => {
  console.error("Preview smoke preflight failed; no credentials logged");
  process.exitCode = 1;
});
