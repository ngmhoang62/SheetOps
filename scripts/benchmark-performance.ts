import { loadStagingEnv } from "./staging-env";
import { assertStaging } from "../src/lib/environment";
import { generateOrders } from "../src/lib/seed";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
loadStagingEnv();
assertStaging(process.env);
const base = process.env.PERF_BASE_URL || "http://127.0.0.1:3001";
const allowed = [
  "http://127.0.0.1:3001",
  "https://sheetops-git-dev-nguyen-minh-hoang-s-team.vercel.app",
];
if (!allowed.includes(base) || process.env.RUN_PERFORMANCE_TESTS !== "1")
  throw Error("Explicit isolated benchmark required");
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
const run = randomUUID(),
  ids: string[] = [];
let userId = "";
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const samples: Record<string, number[]> = {};
const responses: { path: string; ms: number; bytes: number; status: number }[] =
  [];
function record(k: string, v: number) {
  (samples[k] ??= []).push(Math.round(v));
}
async function main() {
  try {
    const initial = await service
      .from("orders")
      .select("id", { count: "exact", head: true });
    if (initial.error || ![0, 300].includes(initial.count ?? -1))
      throw Error("Benchmark requires empty staging; existing data preserved");
    const email = "perf-" + run + "@example.invalid",
      password = randomUUID() + "Aa1!";
    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user)
      throw Error("Fixture Auth unavailable");
    userId = created.data.user.id;
    const profile = await service.from("profiles").insert({
      id: userId,
      email,
      full_name: "Synthetic benchmark Admin",
      role: "admin",
      is_active: true,
    });
    if (profile.error) throw Error("Fixture profile unavailable");
    const c = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const signed = await c.auth.signInWithPassword({ email, password });
    if (signed.error) throw Error("Fixture login unavailable");
    const count = Number(process.env.PERF_ORDER_COUNT || 300);
    if (![300, 2000].includes(count)) throw Error("Unsupported scale");
    const source = generateOrders();
    for (let offset = initial.count ?? 0; offset < count; offset += 100) {
      const rows = Array.from(
        { length: Math.min(100, count - offset) },
        (_, j) => {
          const o = source[(offset + j) % 300];
          const id = randomUUID();
          ids.push(id);
          return {
            id,
            order_code: "PERF-" + run.slice(0, 8) + "-" + (offset + j),
            customer_name: o.customer_name,
            order_date: o.order_date,
            status: o.status,
            total_amount: String(o.total_amount),
            note: "Synthetic performance fixture",
          };
        },
      );
      const r = await c.from("orders").insert(rows);
      if (r.error) throw Error("Fixture seed failed");
    }
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
    });
    if (process.env.VERCEL_OIDC_TOKEN) {
      await context.route(base + "/**", (route) =>
        route.continue({
          headers: {
            ...route.request().headers(),
            "x-vercel-trusted-oidc-idp-token": process.env.VERCEL_OIDC_TOKEN!,
          },
        }),
      );
    }
    const page = await context.newPage();
    expect.configure({ timeout: 30000 });
    page.setDefaultTimeout(30000);
    page.on("response", async (r) => {
      if (
        new URL(r.url()).origin !== base ||
        !new URL(r.url()).pathname.startsWith("/api/")
      )
        return;
      await r.finished().catch(() => {});
      responses.push({
        path: new URL(r.url()).pathname,
        ms: Math.round(r.request().timing().responseEnd),
        bytes: (await r.body().catch(() => Buffer.alloc(0))).byteLength,
        status: r.status(),
      });
    });
    await page.goto(base + "/login");
    if (
      !(await page
        .getByRole("button", { name: "Đăng nhập", exact: true })
        .isVisible())
    )
      throw Error("Preview protection blocks app access");
    const summary = page
      .waitForResponse(
        (r) => r.url().includes("/api/dashboard/summary") && r.ok(),
      )
      .catch(() => null);
    const start = performance.now();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    const submitted = performance.now();
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.waitForURL("**/dashboard");
    await summary;
    await expect(
      page.getByText("Đang tải thống kê…", { exact: true }),
    ).toHaveCount(0);
    record("login_data", performance.now() - submitted);
    record("login_form_to_data", performance.now() - start);
    for (
      let sample = 1;
      sample < Number(process.env.PERF_LOGIN_SAMPLES || 1);
      sample++
    ) {
      await context.request.post(base + "/api/auth/logout", {
        headers: { Origin: base },
      });
      await page.goto(base + "/login");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
      const response = page
        .waitForResponse(
          (r) => r.url().includes("/api/dashboard/summary") && r.ok(),
        )
        .catch(() => null);
      const t = performance.now();
      await page
        .getByRole("button", { name: "Đăng nhập", exact: true })
        .click();
      await page.waitForURL("**/dashboard");
      await response;
      await expect(
        page.getByText("Đang tải thống kê…", { exact: true }),
      ).toHaveCount(0);
      record("login_data", performance.now() - t);
    }
    const routes = [
      ["Đơn hàng", "Đơn hàng", "/api/orders"],
      ["Báo cáo", "Báo cáo vận hành", "/api/dashboard/summary"],
      ["Người dùng", "Người dùng & vai trò", "/api/users"],
      ["Đồng bộ dữ liệu", "Trung tâm đồng bộ", "/api/sync/runs"],
      ["Cài đặt", "Cài đặt", "/api/audit"],
      ["Tổng quan", "Tổng quan hoạt động", "/api/dashboard/summary"],
    ];
    for (let cycle = 0; cycle < Number(process.env.PERF_CYCLES || 20); cycle++)
      for (const [label, heading, endpoint] of routes) {
        const t = performance.now();
        const response =
          process.env.PERF_CACHE_MODE === "1"
            ? null
            : page
                .waitForResponse(
                  (r) => new URL(r.url()).pathname === endpoint && r.ok(),
                )
                .catch(() => null);
        await page
          .getByRole("navigation", { name: "Điều hướng chính" })
          .getByRole("link", { name: label, exact: true })
          .click();
        await expect(
          page.getByRole("heading", { name: heading, exact: true }).first(),
        ).toBeVisible();
        record(label + "_ui", performance.now() - t);
        if (response) {
          const r = await response;
          if (!r) throw Error("Data response timeout");
          await r.finished();
        }
        await expect(
          page.getByText(/Đang tải (thống kê|dữ liệu|đơn hàng)…/, {
            exact: true,
          }),
        ).toHaveCount(0);
        record(label + "_data", performance.now() - t);
      }
    const metrics = Object.fromEntries(
      Object.entries(samples).map(([k, values]) => {
        const a = [...values].sort((a, b) => a - b);
        return [
          k,
          {
            n: a.length,
            p50: a[Math.ceil(a.length * 0.5) - 1],
            p95: a.length >= 20 ? a[Math.ceil(a.length * 0.95) - 1] : null,
            raw: values,
          },
        ];
      }),
    );
    mkdirSync("output/performance", { recursive: true });
    const result = {
      base,
      count,
      metrics,
      responses,
      requests: responses.length,
    };
    writeFileSync(
      "output/performance/" +
        (process.env.PERF_LABEL || "baseline-local") +
        ".json",
      JSON.stringify(result, null, 2),
    );
    console.log(
      JSON.stringify({
        base,
        count,
        metrics: Object.fromEntries(
          Object.entries(metrics).map(([k, v]) => [
            k,
            { n: v.n, p50: v.p50, p95: v.p95 },
          ]),
        ),
      }),
    );
  } finally {
    await browser?.close();
    for (let offset = 0; offset < ids.length; offset += 100) {
      const r = await service
        .from("orders")
        .delete()
        .in("id", ids.slice(offset, offset + 100));
      if (r.error) throw Error("Fixture cleanup incomplete");
    }
    if (userId) {
      await service.from("audit_logs").delete().eq("actor_id", userId);
      await service.from("profiles").delete().eq("id", userId);
      const r = await service.auth.admin.deleteUser(userId);
      if (r.error) throw Error("Auth fixture cleanup incomplete");
    }
  }
}
main().catch((e) => {
  console.error(
    "Benchmark failed: " +
      (e instanceof Error &&
      /^(Fixture|Benchmark|Preview|Data|Auth fixture)/.test(e.message)
        ? e.message
        : "sanitized failure; inspect isolated prerequisites"),
  );
  process.exitCode = 1;
});
