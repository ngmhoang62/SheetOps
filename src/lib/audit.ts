import { z } from "zod";
import { exactMoney } from "./contracts";
import {
  isISODate,
  roleLabels,
  statusLabels,
  type Role,
  type Status,
} from "./domain";
export const auditActions = {
  created: "Tạo",
  updated: "Cập nhật",
  deleted: "Ẩn (lịch sử)",
  hidden: "Ẩn đơn hàng",
  restored: "Kích hoạt lại",
  import: "Nhập Sheets",
  export: "Xuất Sheets",
} as const;
export const auditResources = {
  orders: "Đơn hàng",
  profiles: "Người dùng",
  workspace_settings: "Cài đặt",
  sync_runs: "Đồng bộ",
} as const;
export const auditRoles = {
  ...roleLabels,
  system: "Hệ thống",
  unknown: "Không xác định",
};
const date = z
  .string()
  .refine((v) => !v || isISODate(v), "Ngày không hợp lệ")
  .default("");
export const auditQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    role: z
      .enum(["all", "admin", "editor", "viewer", "system", "unknown"])
      .default("all"),
    action: z
      .enum([
        "all",
        "created",
        "updated",
        "deleted",
        "hidden",
        "restored",
        "import",
        "export",
      ])
      .default("all"),
    resource: z
      .enum(["all", "orders", "profiles", "workspace_settings", "sync_runs"])
      .default("all"),
    from: date,
    to: date,
    search: z.string().trim().max(100).default(""),
  })
  .strict()
  .refine(
    (v) => !v.from || !v.to || v.from <= v.to,
    "Khoảng ngày không hợp lệ",
  );
export type AuditEvent = {
  id: string;
  created_at: string;
  actor_name: string;
  actor_role: keyof typeof auditRoles;
  actor_context: "snapshot" | "current" | "system" | "unknown";
  action: keyof typeof auditActions;
  resource_type: keyof typeof auditResources;
  resource_label: string;
  details: Record<string, string>;
};
export type AuditPage = {
  events: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
};
export function auditDetail(event: AuditEvent) {
  const d = event.details;
  if (event.action === "hidden" || event.action === "deleted")
    return "Chuyển sang danh sách đã ẩn";
  if (event.action === "restored") return "Đưa lại vào danh sách hoạt động";
  if (d.row_count) return `${d.row_count} đơn hàng`;
  const changes: string[] = [];
  const fields: [string, string, (value: string) => string][] = [
    ["status", "Trạng thái", (v) => statusLabels[v as Status] ?? v],
    ["amount", "Số tiền", (v) => (/^\d+$/.test(v) ? exactMoney(v) : v)],
    ["role", "Vai trò", (v) => roleLabels[v as Role] ?? v],
    ["active", "Truy cập", (v) => (v === "true" ? "Hoạt động" : "Vô hiệu hóa")],
    ["name", "Tên", (v) => v],
    ["organization", "Tổ chức", (v) => v],
  ];
  for (const [key, label, format] of fields) {
    const before = d[key + "_before"],
      after = d[key + "_after"];
    if (before !== undefined && after !== undefined && before !== after)
      changes.push(`${label}: ${format(before)} → ${format(after)}`);
  }
  if (changes.length) return changes.join("; ");
  if (event.action === "created" && event.resource_type === "orders")
    return [
      d.status_after ? statusLabels[d.status_after as Status] : "",
      d.amount_after ? exactMoney(d.amount_after) : "",
    ]
      .filter(Boolean)
      .join(" · ");
  return "—";
}
