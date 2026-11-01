import { z } from "zod";

export const roles = ["admin", "editor", "viewer"] as const;
export type Role = (typeof roles)[number];
export const roleLabels: Record<Role, string> = {
  admin: "Quản trị viên",
  editor: "Biên tập viên",
  viewer: "Người xem",
};
export const statuses = ["pending", "completed", "cancelled"] as const;
export type Status = (typeof statuses)[number];
export const statusLabels: Record<Status, string> = {
  pending: "Chờ xử lý",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export function isISODate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export const orderInputSchema = z.object({
  order_code: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã đơn hàng")
    .max(40, "Tối đa 40 ký tự")
    .regex(/^[A-Za-z0-9-]+$/, "Chỉ dùng chữ, số và dấu gạch ngang")
    .transform((s) => s.toUpperCase()),
  customer_name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên khách hàng")
    .max(200, "Tối đa 200 ký tự"),
  order_date: z.string().refine(isISODate, "Ngày không hợp lệ (YYYY-MM-DD)"),
  status: z.enum(statuses, { error: "Trạng thái không hợp lệ" }),
  total_amount: z
    .number({ error: "Vui lòng nhập số tiền" })
    .int("Số tiền phải là số nguyên VND")
    .min(0, "Số tiền không được âm")
    .max(1_000_000_000_000, "Giới hạn demo: 1.000 tỷ VND"),
  note: z.string().trim().max(2000, "Ghi chú tối đa 2.000 ký tự"),
});
export type OrderInput = z.infer<typeof orderInputSchema>;
export const orderSchema = orderInputSchema.extend({
  id: z.uuid(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  updated_by: z.uuid(),
  deleted_at: z.iso.datetime().nullable(),
});
export type Order = z.infer<typeof orderSchema>;
export const userSchema = z.object({
  id: z.uuid(),
  full_name: z.string().trim().min(1).max(200),
  email: z.email(),
  role: z.enum(roles),
  is_active: z.boolean(),
});
export type DemoUser = z.infer<typeof userSchema>;
export const auditSchema = z.object({
  id: z.uuid(),
  actor_id: z.uuid(),
  action: z.string(),
  resource_id: z.string(),
  created_at: z.iso.datetime(),
});
export type AuditEvent = z.infer<typeof auditSchema>;
export const snapshotSchema = z
  .object({
    version: z.literal(1),
    orders: z.array(orderSchema).max(5000),
    users: z.array(userSchema).min(1).max(100),
    audit: z.array(auditSchema).max(100),
    organization: z.string().trim().min(1).max(100),
  })
  .superRefine((s, ctx) => {
    if (
      new Set(s.orders.map((o) => o.order_code)).size !== s.orders.length ||
      new Set(s.orders.map((o) => o.id)).size !== s.orders.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate stored orders" });
    if (
      !s.users.some((u) => u.role === "admin" && u.is_active) ||
      new Set(s.users.map((u) => u.id)).size !== s.users.length ||
      new Set(s.users.map((u) => u.email.toLowerCase())).size !== s.users.length
    )
      ctx.addIssue({ code: "custom", message: "Invalid stored users" });
  });
export type Snapshot = z.infer<typeof snapshotSchema>;
export function canWrite(role: Role) {
  return role === "admin" || role === "editor";
}
export function canAccess(role: Role, path: string) {
  return (
    !["/users", "/sync", "/settings"].some(
      (p) => path === p || path.startsWith(p + "/"),
    ) || role === "admin"
  );
}

export function validateOrder(
  input: unknown,
  orders: Order[],
  editingId?: string,
): OrderInput {
  const data = orderInputSchema.parse(input);
  if (
    orders.some(
      (o) =>
        o.id !== editingId && o.order_code.toUpperCase() === data.order_code,
    )
  )
    throw new Error("Mã đơn hàng đã tồn tại, kể cả trong đơn đã xóa.");
  return data;
}

export function upsertOrder(
  orders: Order[],
  input: unknown,
  role: Role,
  actor: string,
  id?: string,
  now = new Date().toISOString(),
): Order[] {
  if (!canWrite(role)) throw new Error("Bạn không có quyền thay đổi đơn hàng.");
  if (id && !orders.some((o) => o.id === id && !o.deleted_at))
    throw new Error("Không tìm thấy đơn hàng.");
  if (!id && orders.length >= 5000)
    throw new Error("Đã đạt giới hạn 5.000 đơn hàng của bản demo.");
  const data = validateOrder(input, orders, id);
  if (id)
    return orders.map((o) =>
      o.id === id ? { ...o, ...data, updated_by: actor, updated_at: now } : o,
    );
  return [
    {
      ...data,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      updated_by: actor,
      deleted_at: null,
    },
    ...orders,
  ];
}

export function softDelete(
  orders: Order[],
  id: string,
  role: Role,
  actor: string,
  now = new Date().toISOString(),
): Order[] {
  if (!canWrite(role)) throw new Error("Bạn không có quyền xóa đơn hàng.");
  if (!orders.some((o) => o.id === id && !o.deleted_at))
    throw new Error("Không tìm thấy đơn hàng.");
  return orders.map((o) =>
    o.id === id
      ? { ...o, deleted_at: now, updated_at: now, updated_by: actor }
      : o,
  );
}

export function changeUser(
  users: DemoUser[],
  id: string,
  change: Partial<Pick<DemoUser, "role" | "is_active">>,
  actor: string,
  role: Role,
): DemoUser[] {
  if (role !== "admin")
    throw new Error("Chỉ quản trị viên được thay đổi người dùng.");
  if (id === actor)
    throw new Error("Không thể thay đổi quyền hoặc vô hiệu hóa chính mình.");
  if (!users.some((u) => u.id === id))
    throw new Error("Không tìm thấy người dùng.");
  const next = users.map((u) =>
    u.id === id ? userSchema.parse({ ...u, ...change }) : u,
  );
  if (!next.some((u) => u.role === "admin" && u.is_active))
    throw new Error("Cần ít nhất một quản trị viên đang hoạt động.");
  return next;
}
