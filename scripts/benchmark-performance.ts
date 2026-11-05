import { loadStagingEnv } from "./staging-env";
import { assertStaging } from "../src/lib/environment";
import { generateOrders } from "../src/lib/seed";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect as baseExpect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { verifyResponsive } from "./responsive-check";
import {
  benchmarkPlan,
  lockPreview,
  PreviewTraffic,
  previewOrigin,
} from "./preview-traffic";
loadStagingEnv();
assertStaging(process.env);
const base = process.env.PERF_BASE_URL || "http://127.0.0.1:3001";
const allowed = [
  "http://127.0.0.1:3001",
  ...(process.env.PREVIEW_ORIGIN ? [previewOrigin()] : []),
];
if (!allowed.includes(base) || process.env.RUN_PERFORMANCE_TESTS !== "1")
  throw Error("Explicit isolated benchmark required");
const plan = benchmarkPlan(base, process.env);
const traffic =
  base !== "http://127.0.0.1:3001" && base === previewOrigin()
    ? new PreviewTraffic()
    : null;
const expect = baseExpect.configure({ timeout: traffic ? 90000 : 30000 });
let unlock: (() => void) | undefined;
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
const run = randomUUID(),
  ids: string[] = [];
let userId = "";
let phase = "preflight";
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const samples: Record<string, number[]> = {};
const responses: {
  path: string;
  ms: number;
  bytes: number;
  status: number;
  serverTiming: string;
}[] = [];
const loginAttempts: { ms: number; status: string }[] = [];
function record(k: string, v: number) {
  (samples[k] ??= []).push(Math.round(v));
}
async function main() {
  try {
    if (traffic) unlock = lockPreview();
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
    if (profile.error)
      throw Error("Fixture profile unavailable: " + profile.error.code);
    const c = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const signed = await c.auth.signInWithPassword({ email, password });
    if (signed.error) throw Error("Fixture login unavailable");
    const count = plan.count;
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
            order_code:
              "PERF-" + run.slice(0, 8).toUpperCase() + "-" + (offset + j),
            customer_name: o.customer_name,
            order_date: o.order_date,
            status: o.status,
            total_amount: String(o.total_amount),
            note: "Synthetic performance fixture",
          };
        },
      );
      const r = await c.from("orders").insert(rows);
      if (r.error) throw Error("Fixture seed failed: " + r.error.code);
    }
    browser = await chromium.launch({ channel: "chrome", headless: true });
    phase = "browser login";
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
    });
    if (traffic) {
      traffic.focusRoute("/login");
      await traffic.attach(context, process.env.VERCEL_OIDC_TOKEN);
    } else if (process.env.VERCEL_OIDC_TOKEN) {
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
    page.setDefaultTimeout(traffic ? 90000 : 30000);
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
        serverTiming: r.headers()["server-timing"] ?? "",
      });
    });
    await page.goto(base + "/login");
    if (
      !(await page
        .getByRole("button", { name: "Đăng nhập", exact: true })
        .isVisible())
    )
      throw Error("Preview protection blocks app access");
    const start = performance.now();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    const submitted = performance.now();
    traffic?.focusRoute("/dashboard");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.waitForURL("**/dashboard");
    await expect(page.getByTestId("Tổng đơn hàng")).toHaveText(
      count.toLocaleString("vi-VN"),
    );
    await expect(
      page.getByText("Đang tải thống kê…", { exact: true }),
    ).toHaveCount(0);
    record("login_data", performance.now() - submitted);
    loginAttempts.push({
      ms: Math.round(performance.now() - submitted),
      status: "success",
    });
    record("login_form_to_data", performance.now() - start);
    for (let sample = 1; sample < plan.logins; sample++) {
      const loggedOut = await context.request.post(base + "/api/auth/logout", {
        headers: {
          Origin: base,
          ...(process.env.VERCEL_OIDC_TOKEN
            ? {
                "x-vercel-trusted-oidc-idp-token":
                  process.env.VERCEL_OIDC_TOKEN,
              }
            : {}),
        },
      });
      if (!loggedOut.ok()) throw Error("Data logout failed");
      await page.goto(base + "/login");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
      const t = performance.now();
      await page
        .getByRole("button", { name: "Đăng nhập", exact: true })
        .click();
      await page.waitForURL("**/dashboard");
      await expect(page.getByTestId("Tổng đơn hàng")).toHaveText(
        count.toLocaleString("vi-VN"),
      );
      await expect(
        page.getByText("Đang tải thống kê…", { exact: true }),
      ).toHaveCount(0);
      record("login_data", performance.now() - t);
      loginAttempts.push({
        ms: Math.round(performance.now() - t),
        status: "success",
      });
    }
    const routes = [
      ["Đơn hàng", "Đơn hàng", "/api/orders"],
      ["Báo cáo", "Báo cáo vận hành", "/api/dashboard/summary"],
      ["Người dùng", "Người dùng & vai trò", "/api/users"],
      ["Đồng bộ dữ liệu", "Trung tâm đồng bộ", "/api/sync/runs"],
      ["Cài đặt", "Cài đặt", "/api/audit"],
      ["Tổng quan", "Tổng quan hoạt động", "/api/dashboard/summary"],
    ];
    for (let cycle = 0; cycle < plan.cycles; cycle++)
      for (const [label, heading, endpoint] of routes) {
        phase = "navigation:" + label;
        traffic?.focusRoute(
          (
            {
              "Đơn hàng": "/orders",
              "Báo cáo": "/reports",
              "Người dùng": "/users",
              "Đồng bộ dữ liệu": "/sync",
              "Cài đặt": "/settings",
              "Tổng quan": "/dashboard",
            } as Record<string, string>
          )[label],
        );
        const t = performance.now();
        const response =
          process.env.PERF_CACHE_MODE !== "0"
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
        await expect(page.locator("main [role=alert]")).toHaveCount(0);
        if (["Tổng quan", "Báo cáo"].includes(label))
          await expect(page.getByTestId("Tổng đơn hàng")).toHaveText(
            count.toLocaleString("vi-VN"),
          );
        if (label === "Đơn hàng")
          await expect(page.locator("tbody tr").first()).toBeVisible();
        record(label + "_data", performance.now() - t);
        if (label === "Người dùng") {
          const button = page.getByRole("button", {
            name: "Mời người dùng",
            exact: true,
          });
          await expect(button).toBeVisible();
          const started = performance.now();
          await button.click();
          await expect(page.getByRole("dialog")).toBeVisible();
          record("invitation_dialog_ack", performance.now() - started);
          await page
            .getByRole("dialog")
            .getByRole("button", { name: "Hủy", exact: true })
            .click();
        }
      }
    for (let sample = 0; sample < plan.apiSamples; sample++) {
      phase = "authenticated API";
      for (const endpoint of [
        "/api/session",
        "/api/orders",
        "/api/dashboard/summary",
        "/api/users",
        "/api/sync/runs",
        "/api/audit",
        ...(count === 2000
          ? [
              "/api/orders?search=PERF&sort=total_amount&direction=desc&page=1",
              "/api/orders?search=PERF&sort=total_amount&direction=desc&page=2",
              "/api/orders?status=completed&sort=order_code&direction=asc",
              "/api/orders?status=pending&from=2026-01-01&to=2026-12-31&page=2",
            ]
          : []),
      ]) {
        const t = performance.now();
        const response = await page.evaluate(async (endpoint) => {
          const r = await fetch(endpoint, { cache: "no-store" });
          const body = await r.text();
          if (r.ok && endpoint.startsWith("/api/orders")) {
            const data = JSON.parse(body).data;
            if (
              data.orders.length > 20 ||
              new Set(data.orders.map((row: { id: string }) => row.id)).size !==
                data.orders.length
            )
              throw Error("Invalid server pagination");
            if (endpoint.includes("sort=total_amount"))
              for (let i = 1; i < data.orders.length; i++)
                if (
                  BigInt(data.orders[i - 1].total_amount) <
                  BigInt(data.orders[i].total_amount)
                )
                  throw Error("Invalid exact-amount sort");
          }
          return { status: r.status, ok: r.ok };
        }, endpoint);
        const ms = Math.round(performance.now() - t);
        if (response.ok) record("api:" + endpoint, ms);
      }
    }
    if (process.env.PERF_RESPONSIVE === "1")
      await verifyResponsive(page, base, process.env.PERF_LABEL || "benchmark");
    const browserResources = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .map((entry) => {
          const r = entry as PerformanceResourceTiming;
          return {
            type: r.initiatorType,
            path: new URL(r.name).pathname,
            duration: Math.round(r.duration),
            transfer: r.transferSize,
            body: r.encodedBodySize,
            ttfb: Math.round(r.responseStart - r.requestStart),
          };
        })
        .filter((r) => r.path.startsWith("/_next/")),
    );
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
      loginAttempts,
      browserResources,
      intentionalPacing: !!traffic,
      traffic: traffic?.stats,
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
    unlock?.();
    for (let offset = 0; offset < ids.length; offset += 100) {
      const r = await service
        .from("orders")
        .delete()
        .in("id", ids.slice(offset, offset + 100));
      if (r.error) throw Error("Fixture cleanup incomplete");
    }
    if (userId) {
      const audit = await service
        .from("audit_logs")
        .delete()
        .or("actor_id.eq." + userId + ",resource_id.eq." + userId);
      if (audit.error) throw Error("Fixture audit cleanup incomplete");
      const profile = await service.from("profiles").delete().eq("id", userId);
      if (profile.error) throw Error("Fixture profile cleanup incomplete");
      const r = await service.auth.admin.deleteUser(userId);
      if (r.error) throw Error("Auth fixture cleanup incomplete");
    }
  }
}
main().catch((e) => {
  mkdirSync("output/performance", { recursive: true });
  writeFileSync(
    "output/performance/" +
      (process.env.PERF_LABEL || "benchmark") +
      "-failed.json",
    JSON.stringify(
      {
        phase,
        status: traffic?.blocked ? "BLOCKED" : "FAIL",
        infrastructureReason: traffic?.blocked,
        samples,
        loginAttempts,
        responses,
        error: e instanceof Error ? e.message.split("\n")[0] : "unknown",
      },
      null,
      2,
    ),
  );
  console.error(
    "Benchmark failed at " +
      phase +
      ": " +
      (e instanceof Error &&
      /^(Fixture|Benchmark|Preview|Data|Auth fixture)/.test(e.message)
        ? e.message
        : "sanitized failure; inspect isolated prerequisites"),
  );
  process.exitCode = 1;
});
