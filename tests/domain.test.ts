import { describe, expect, it } from "vitest";
import {
  changeUser,
  canAccess,
  isISODate,
  orderInputSchema,
  snapshotSchema,
  softDelete,
  upsertOrder,
  validateOrder,
  type Order,
  type OrderInput,
} from "../src/lib/domain";
import {
  defaultFilters,
  filterOrders,
  monthlyRevenue,
  ordersCSV,
  statusSummary,
  summarize,
} from "../src/lib/analytics";
import { demoUsers, generateOrders, initialSnapshot } from "../src/lib/seed";

const input: OrderInput = {
  order_code: "SO-TEST-001",
  customer_name: "Khách hàng giả lập",
  order_date: "2026-06-15",
  status: "completed",
  total_amount: 1_234_567,
  note: "Dữ liệu kiểm thử",
};
const actor = demoUsers[0].id;
const fixedNow = "2026-11-01T16:00:00.000Z";

describe("deterministic seed", () => {
  it("generates exactly 300 identical valid orders with 25 in each of 12 months", () => {
    const orders = generateOrders();
    expect(orders).toEqual(generateOrders());
    expect(orders).toHaveLength(300);
    expect(new Set(orders.map((o) => o.id)).size).toBe(300);
    expect(new Set(orders.map((o) => o.order_code)).size).toBe(300);
    expect(snapshotSchema.safeParse(initialSnapshot()).success).toBe(true);
    expect(monthlyRevenue(orders).map((m) => m.count)).toEqual(
      Array(12).fill(25),
    );
    expect(new Set(orders.map((o) => o.status)).size).toBe(3);
    expect(orders.every((o) => Number.isSafeInteger(o.total_amount))).toBe(
      true,
    );
  });
  it("rejects corrupt persisted snapshots and duplicate IDs/codes", () => {
    const snapshot = initialSnapshot();
    expect(snapshotSchema.safeParse({ ...snapshot, version: 2 }).success).toBe(
      false,
    );
    snapshot.orders[1] = { ...snapshot.orders[0] };
    expect(snapshotSchema.safeParse(snapshot).success).toBe(false);
    expect(
      snapshotSchema.safeParse({
        ...initialSnapshot(),
        users: demoUsers.filter((u) => u.role !== "admin"),
      }).success,
    ).toBe(false);
  });
});

describe("validation", () => {
  it.each([
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-01",
    "2026-6-2",
    "invalid",
    "",
    "2026-11-01T00:00:00Z",
  ])("rejects invalid date %s", (date) => {
    expect(isISODate(date)).toBe(false);
    expect(
      orderInputSchema.safeParse({ ...input, order_date: date }).success,
    ).toBe(false);
  });
  it("accepts actual dates, including a leap day", () => {
    expect(isISODate("2024-02-29")).toBe(true);
    expect(isISODate("2026-12-31")).toBe(true);
  });
  it.each([
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    1_000_000_000_001,
  ])("rejects invalid VND %s", (amount) => {
    expect(
      orderInputSchema.safeParse({ ...input, total_amount: amount }).success,
    ).toBe(false);
  });
  it("rejects blank or excessive text and invalid statuses", () => {
    for (const patch of [
      { customer_name: "   " },
      { customer_name: "a".repeat(201) },
      { order_code: "" },
      { status: "done" },
      { note: "a".repeat(2001) },
    ])
      expect(orderInputSchema.safeParse({ ...input, ...patch }).success).toBe(
        false,
      );
    expect(
      orderInputSchema.parse({ ...input, total_amount: 0 }).total_amount,
    ).toBe(0);
  });
  it("normalizes and reserves codes even after soft deletion", () => {
    const orders = generateOrders();
    expect(() =>
      validateOrder({ ...input, order_code: " so-2026-0001 " }, orders),
    ).toThrow("đã tồn tại");
    const deleted = softDelete(orders, orders[0].id, "admin", actor, fixedNow);
    expect(() =>
      validateOrder({ ...input, order_code: "SO-2026-0001" }, deleted),
    ).toThrow("đã tồn tại");
    expect(validateOrder(orders[0], orders, orders[0].id).order_code).toBe(
      orders[0].order_code,
    );
  });
});

describe("CRUD and aggregate consistency", () => {
  it("creates, edits, and soft deletes without mutating the seed; all summaries follow", () => {
    const seed = generateOrders();
    const before = summarize(seed);
    const created = upsertOrder(
      seed,
      input,
      "editor",
      actor,
      undefined,
      fixedNow,
    );
    expect(summarize(created)).toEqual({
      total: 301,
      completed: before.completed + 1,
      revenue: before.revenue + input.total_amount,
      rate: ((before.completed + 1) / 301) * 100,
    });
    const id = created[0].id;
    const pending = upsertOrder(
      created,
      { ...input, status: "pending" },
      "admin",
      actor,
      id,
      fixedNow,
    );
    expect(summarize(pending).revenue).toBe(before.revenue);
    const completed = upsertOrder(
      pending,
      { ...input, total_amount: 200_000 },
      "admin",
      actor,
      id,
      fixedNow,
    );
    const deleted = softDelete(completed, id, "editor", actor, fixedNow);
    expect(deleted[0].deleted_at).toBe(fixedNow);
    expect(deleted[0].updated_by).toBe(actor);
    expect(filterOrders(deleted, defaultFilters)).toHaveLength(300);
    expect(summarize(deleted)).toEqual(before);
    expect(ordersCSV(deleted)).not.toContain(input.order_code);
    expect(seed).toHaveLength(300);
    expect(seed.every((o) => !o.deleted_at)).toBe(true);
    expect(monthlyRevenue(deleted).reduce((sum, m) => sum + m.revenue, 0)).toBe(
      before.revenue,
    );
    expect(statusSummary(deleted).reduce((sum, s) => sum + s.value, 0)).toBe(
      before.total,
    );
  });
  it("excludes cancelled/pending amounts, includes zero amounts, handles empty data", () => {
    const order = generateOrders()[0];
    const sample: Order[] = [
      { ...order, status: "completed", total_amount: 0 },
      { ...order, status: "pending", total_amount: 10_000 },
      { ...order, status: "cancelled", total_amount: 50_000 },
      { ...order, status: "completed", total_amount: 7_500 },
      {
        ...order,
        status: "completed",
        total_amount: 1_000_000,
        deleted_at: fixedNow,
      },
    ];
    expect(summarize(sample)).toEqual({
      total: 4,
      completed: 2,
      revenue: 7_500,
      rate: 50,
    });
    expect(summarize([])).toEqual({
      total: 0,
      completed: 0,
      revenue: 0,
      rate: 0,
    });
  });
  it("applies inclusive dates, status, and case-insensitive search consistently", () => {
    const orders = generateOrders();
    const filtered = filterOrders(orders, {
      from: "2026-06-01",
      to: "2026-06-28",
      status: "completed",
      search: "so-2026",
    });
    expect(filtered.length).toBeGreaterThan(0);
    expect(
      filtered.every(
        (o) => o.order_date.startsWith("2026-06") && o.status === "completed",
      ),
    ).toBe(true);
    expect(summarize(filtered).revenue).toBe(
      monthlyRevenue(filtered)[0].revenue,
    );
    const exact = orders[0];
    expect(
      filterOrders(orders, {
        from: exact.order_date,
        to: exact.order_date,
        status: "all",
        search: exact.order_code,
      }),
    ).toEqual([exact]);
    expect(
      filterOrders(orders, {
        from: "2027-01-01",
        to: "2027-12-31",
        status: "all",
      }),
    ).toEqual([]);
    expect(
      filterOrders(orders, {
        from: "2026-12-01",
        to: "2026-01-01",
        status: "all",
      }),
    ).toEqual([]);
  });
  it("rejects edits/deletes to nonexistent or already-deleted records", () => {
    const orders = generateOrders();
    expect(() => upsertOrder(orders, input, "admin", actor, "missing")).toThrow(
      "Không tìm thấy",
    );
    expect(() => softDelete(orders, "missing", "admin", actor)).toThrow(
      "Không tìm thấy",
    );
    const deleted = softDelete(orders, orders[0].id, "admin", actor);
    expect(() =>
      upsertOrder(deleted, input, "admin", actor, orders[0].id),
    ).toThrow("Không tìm thấy");
  });
});

describe("mock permission matrix", () => {
  it("guards mutations and admin routes in addition to hiding UI", () => {
    const orders = generateOrders();
    expect(() => upsertOrder(orders, input, "viewer", actor)).toThrow(
      "không có quyền",
    );
    expect(() => softDelete(orders, orders[0].id, "viewer", actor)).toThrow(
      "không có quyền",
    );
    for (const path of ["/users", "/sync", "/settings", "/users/1"]) {
      expect(canAccess("viewer", path)).toBe(false);
      expect(canAccess("editor", path)).toBe(false);
      expect(canAccess("admin", path)).toBe(true);
    }
    for (const path of ["/dashboard", "/reports", "/orders"])
      expect(canAccess("viewer", path)).toBe(true);
  });
  it("prevents user self-demotion, unauthorized changes, and loss of the last admin", () => {
    expect(() =>
      changeUser(demoUsers, actor, { role: "viewer" }, actor, "admin"),
    ).toThrow("chính mình");
    expect(() =>
      changeUser(
        demoUsers,
        demoUsers[1].id,
        { role: "admin" },
        actor,
        "editor",
      ),
    ).toThrow("Chỉ quản trị");
    expect(() =>
      changeUser(
        demoUsers,
        actor,
        { is_active: false },
        demoUsers[1].id,
        "admin",
      ),
    ).toThrow("ít nhất một");
    expect(
      changeUser(
        demoUsers,
        demoUsers[1].id,
        { role: "viewer" },
        actor,
        "admin",
      )[1].role,
    ).toBe("viewer");
  });
});

describe("CSV snapshot", () => {
  it("exports a BOM, canonical headers, stable code order and quoted Vietnamese text", () => {
    const order = generateOrders()[0];
    const csv = ordersCSV([
      {
        ...order,
        order_code: "SO-Z",
        note: 'Ghi chú, có "ngoặc"\nvà dòng mới',
      },
      { ...order, order_code: "SO-A" },
    ]);
    expect(
      csv.startsWith(
        "\uFEFForder_code,customer_name,order_date,status,total_amount,note,updated_at\r\n",
      ),
    ).toBe(true);
    expect(csv.indexOf("SO-A")).toBeLessThan(csv.indexOf("SO-Z"));
    expect(csv).toContain('"Ghi chú, có ""ngoặc""\nvà dòng mới"');
  });
  it.each([
    "=HYPERLINK(1)",
    "+SUM(A1)",
    "-1+2",
    "@SUM(A1)",
    "  =1+2",
    "\tformula",
    "\nformula",
  ])("neutralizes spreadsheet formula input %s", (note) => {
    expect(ordersCSV([{ ...generateOrders()[0], note }])).toContain(
      `"'${note}"`,
    );
  });
});
