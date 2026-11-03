import { loadStagingEnv } from "./staging-env";
import { assertStaging } from "../src/lib/environment";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuditEvent } from "../src/lib/audit";
import { chromium, expect as baseExpect, type Browser } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { roleLabels } from "../src/lib/domain";
loadStagingEnv();
assertStaging(process.env);
if (process.env.RUN_AUDIT_TESTS !== "1")
  throw Error("Explicit isolated audit UI test required");
const base = "http://127.0.0.1:3001",
  expect = baseExpect.configure({ timeout: 20000 });
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const prefix = "AQ-" + randomUUID().slice(0, 8).toUpperCase(),
  ids: string[] = [],
  users: {
    id: string;
    email: string;
    password: string;
    client: SupabaseClient;
  }[] = [],
  checks: string[] = [];
let browser: Browser | undefined,
  phase = "baseline",
  complete = false;
const digest = (x: unknown) =>
  createHash("sha256").update(JSON.stringify(x)).digest("hex");
async function snapshot(table: string, fields: string) {
  const rows: unknown[] = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await service
      .from(table)
      .select(fields)
      .order("id")
      .range(offset, offset + 999);
    if (r.error) throw Error("Baseline unavailable");
    rows.push(...r.data);
    if (r.data.length < 1000) return digest(rows);
  }
}
async function main() {
  const beforeOrders = await snapshot(
      "orders",
      "id,order_code,total_amount,deleted_at,updated_at",
    ),
    beforeAudit = await snapshot("audit_logs", "*");
  try {
    for (const role of ["admin", "editor"]) {
      const email = `audit-${randomUUID()}@example.invalid`,
        password = randomUUID() + "Aa1!";
      const created = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (created.error || !created.data.user)
        throw Error("Fixture user unavailable");
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const user = { id: created.data.user.id, email, password, client };
      users.push(user);
      if (
        (
          await service.from("profiles").insert({
            id: user.id,
            email,
            full_name: prefix + " " + role,
            role,
            is_active: true,
          })
        ).error
      )
        throw Error("Fixture profile unavailable");
      if ((await client.auth.signInWithPassword({ email, password })).error)
        throw Error("Fixture authentication unavailable");
      const rows = Array.from(
        { length: role === "admin" ? 70 : 20 },
        (_, i) => {
          const id = randomUUID();
          ids.push(id);
          return {
            id,
            order_code: `${prefix}-${role === "admin" ? "A" : "E"}-${String(i).padStart(3, "0")}`,
            customer_name: "Khách hàng kiểm thử audit",
            order_date: "2026-11-04",
            status: "pending",
            total_amount: "100",
            note: "Scoped synthetic audit fixture",
          };
        },
      );
      if ((await client.from("orders").insert(rows)).error)
        throw Error("Fixture orders unavailable");
    }
    phase = "server pagination";
    const args = {
      query_input: prefix,
      resource_input: "orders",
      role_input: "admin",
      size_input: 50,
    };
    const first = await users[0].client.rpc("audit_page", {
        ...args,
        page_input: 1,
      }),
      second = await users[0].client.rpc("audit_page", {
        ...args,
        page_input: 2,
      });
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data.total).toBe(70);
    expect(first.data.events).toHaveLength(50);
    expect(second.data.events).toHaveLength(20);
    expect(
      new Set(
        [...first.data.events, ...second.data.events].map(
          (x: AuditEvent) => x.id,
        ),
      ).size,
    ).toBe(70);
    const clamped = await users[0].client.rpc("audit_page", {
      ...args,
      page_input: 999,
    });
    expect(clamped.data.page).toBe(2);
    expect(clamped.data.events).toHaveLength(20);
    checks.push(
      "Server filters precede stable pagination; 70 matches repack into 50/20; out-of-range page clamps",
    );
    phase = "snapshot and RLS";
    if (
      (
        await service
          .from("profiles")
          .update({ role: "viewer", full_name: prefix + " renamed" })
          .eq("id", users[1].id)
      ).error
    )
      throw Error("Fixture role change unavailable");
    const history = await users[0].client.rpc("audit_page", {
      ...args,
      role_input: "editor",
    });
    expect(history.data.total).toBe(20);
    expect(
      history.data.events.every(
        (x: AuditEvent) =>
          x.actor_role === "editor" &&
          x.actor_context === "snapshot" &&
          x.actor_name === prefix + " editor",
      ),
    ).toBe(true);
    expect((await users[1].client.rpc("audit_page", {})).error).not.toBeNull();
    const old = await users[0].client.rpc("audit_page", {
      page_input: 3,
      size_input: 100,
    });
    expect(old.data.total).toBeGreaterThan(100);
    expect(
      old.data.events.some((x: AuditEvent) => x.actor_context === "current"),
    ).toBe(true);
    checks.push(
      "Trusted name/role snapshots survive role/name changes; old events labeled current; Viewer RPC denied",
    );
    const hiddenId = ids[0];
    expect(
      (
        await users[0].client.rpc("set_order_visibility", {
          target: hiddenId,
          hidden_input: true,
        })
      ).error,
    ).toBeNull();
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const ctx = await browser.newContext({
        viewport: { width: 1366, height: 900 },
      }),
      page = await ctx.newPage();
    await page.goto(base + "/login");
    await page.getByLabel("Email", { exact: true }).fill(users[0].email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(users[0].password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.waitForURL("**/dashboard");
    phase = "audit UI";
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Cài đặt", exact: true })
      .click();
    const panel = page.locator(".audit-panel");
    await panel.getByLabel("Lọc loại đối tượng nhật ký").selectOption("orders");
    await panel.getByLabel("Tìm sự kiện").fill(prefix);
    await expect(panel.locator("tbody tr")).toHaveCount(50);
    await expect(panel.getByText(/\/ 91 sự kiện/)).toBeVisible();
    await panel
      .getByRole("button", { name: "Trang sau nhật ký", exact: true })
      .click();
    await expect(panel.getByText("Trang 2 / 2", { exact: true })).toBeVisible();
    await panel.getByLabel("Lọc vai trò nhật ký").selectOption("admin");
    await expect(panel.getByText("Trang 1 / 2", { exact: true })).toBeVisible();
    await expect(panel.locator("tbody tr")).toHaveCount(50);
    expect(await panel.locator("tbody").innerText()).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f-]{27,}/,
    );
    await expect(
      panel.getByRole("columnheader", { name: "Vai trò", exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByRole("columnheader", { name: "Mã đối tượng", exact: true }),
    ).toHaveCount(0);
    await panel.getByLabel("Lọc vai trò nhật ký").selectOption("editor");
    await expect(panel.locator("tbody tr")).toHaveCount(20);
    await expect(panel.locator("tbody tr").first()).toContainText(
      roleLabels.editor,
    );
    checks.push(
      "Browser filter resets page and repacks 50 matches; names/roles/human targets replace UUID columns",
    );
    phase = "orders filter";
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Đơn hàng", exact: true })
      .click();
    await page.getByLabel("Tìm kiếm đơn hàng").fill(prefix);
    await page.getByLabel("Lọc trạng thái").selectOption("hidden");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr")).toContainText("Đã ẩn");
    const box = await page.getByLabel("Lọc trạng thái").boundingBox();
    expect(box!.width).toBeLessThanOrEqual(240);
    await expect(
      page.getByLabel("Hiển thị đơn hàng", { exact: true }),
    ).toHaveCount(0);
    checks.push(
      "Hidden option maps to visibility without changing business status; desktop filter stays compact",
    );
    phase = "report layout";
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Báo cáo", exact: true })
      .click();
    await expect(
      page.getByText("Đang tải thống kê…", { exact: true }),
    ).toHaveCount(0);
    const monthly = await page
        .getByRole("heading", { name: "Chi tiết doanh thu", exact: true })
        .locator("xpath=ancestor::section")
        .boundingBox(),
      status = await page
        .getByRole("heading", { name: "Tổng hợp trạng thái", exact: true })
        .locator("xpath=ancestor::section")
        .boundingBox();
    expect(status!.height).toBeLessThan(monthly!.height - 100);
    mkdirSync("output/annotations", { recursive: true });
    await page.screenshot({
      path: "output/annotations/reports-desktop.png",
      fullPage: true,
    });
    for (const width of [1366, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(base + "/settings");
      await expect(page.locator(".audit-panel tbody tr").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `output/annotations/settings-${width}.png`,
        fullPage: true,
      });
    }
    checks.push(
      "Report panels size independently; loaded audit controls/table fit laptop/mobile viewport",
    );
    complete = true;
  } finally {
    await browser?.close();
    if (ids.length) {
      const removed = await service.from("orders").delete().in("id", ids);
      if (removed.error) throw Error("Scoped order cleanup failed");
      const audit = await service
        .from("audit_logs")
        .delete()
        .in("resource_id", ids);
      if (audit.error) throw Error("Scoped audit cleanup failed");
    }
    for (const u of users) {
      if (
        (
          await service
            .from("audit_logs")
            .delete()
            .or(`actor_id.eq.${u.id},resource_id.eq.${u.id}`)
        ).error
      )
        throw Error("Scoped actor cleanup failed");
      if ((await service.from("profiles").delete().eq("id", u.id)).error)
        throw Error("Profile cleanup failed");
      if ((await service.auth.admin.deleteUser(u.id)).error)
        throw Error("Auth cleanup failed");
    }
    expect(
      await snapshot(
        "orders",
        "id,order_code,total_amount,deleted_at,updated_at",
      ),
    ).toBe(beforeOrders);
    expect(await snapshot("audit_logs", "*")).toBe(beforeAudit);
    checks.push(
      "All retained orders, hidden state and audit history restored exactly; fixture identities removed",
    );
    mkdirSync("output/annotations", { recursive: true });
    writeFileSync(
      "output/annotations/verification.json",
      JSON.stringify({ phase, complete, checks }, null, 2),
    );
    console.log(JSON.stringify({ phase, complete, checks }));
  }
}
main().catch((e) => {
  console.error(
    JSON.stringify({
      phase,
      error:
        e instanceof Error ? e.message.split("\n")[0] : "verification failed",
    }),
  );
  process.exitCode = 1;
});
