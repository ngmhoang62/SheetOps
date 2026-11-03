import { expect, it } from "vitest";
import { auditQuery, auditDetail, type AuditEvent } from "../src/lib/audit";
import { orderFilter } from "../src/lib/order-filter";
it("validates bounded server pagination, real dates and filters", () => {
  expect(auditQuery.parse({})).toMatchObject({
    page: 1,
    pageSize: 50,
    role: "all",
  });
  for (const input of [
    { page: 0 },
    { pageSize: 101 },
    { role: "owner" },
    { from: "2026-02-29" },
    { from: "2026-11-04", to: "2026-11-03" },
    { search: "x".repeat(101) },
  ])
    expect(auditQuery.safeParse(input).success).toBe(false);
  expect(
    auditQuery.parse({
      page: "2",
      pageSize: "50",
      role: "editor",
      from: "2026-11-04",
    }).page,
  ).toBe(2);
});
it("keeps hidden separate from business status while supporting one compact filter", () => {
  expect(orderFilter("hidden")).toEqual({
    status: "all",
    visibility: "hidden",
  });
  expect(orderFilter("active")).toEqual({
    status: "all",
    visibility: "active",
  });
  expect(orderFilter("completed")).toEqual({
    status: "completed",
    visibility: "all",
  });
  expect(orderFilter("all")).toEqual({ status: "all", visibility: "all" });
});
it("formats meaningful audit changes without losing BIGINT precision", () => {
  const event: AuditEvent = {
    id: "test",
    created_at: "2026-11-04T00:00:00Z",
    actor_name: "Synthetic",
    actor_role: "admin",
    actor_context: "snapshot",
    resource_label: "TEST",
    action: "updated",
    resource_type: "orders",
    details: {
      amount_before: "9007199254740992",
      amount_after: "9007199254740993",
      status_before: "pending",
      status_after: "completed",
    },
  };
  expect(auditDetail(event)).toContain("9.007.199.254.740.993");
  expect(auditDetail(event)).toContain("Chờ xử lý → Hoàn thành");
  expect(auditDetail({ ...event, action: "hidden" })).toContain("đã ẩn");
});
