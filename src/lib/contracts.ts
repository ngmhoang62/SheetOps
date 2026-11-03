import { z } from "zod";
import { isISODate, roles, statuses } from "./domain";

export const amountSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,18})$/, "Số tiền phải là số nguyên VND không âm")
  .refine(
    (v) => /^(0|[1-9]\d{0,18})$/.test(v) && BigInt(v) <= 9223372036854775807n,
    "Số tiền vượt giới hạn BIGINT",
  );
export const liveOrderInput = z
  .object({
    order_code: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập mã đơn hàng")
      .max(40, "Mã đơn hàng tối đa 40 ký tự")
      .regex(/^[A-Za-z0-9-]+$/, "Chỉ dùng chữ, số và dấu gạch ngang")
      .transform((v) => v.toUpperCase()),
    customer_name: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập tên khách hàng")
      .max(200, "Tên khách hàng tối đa 200 ký tự"),
    order_date: z.string().refine(isISODate, "Ngày không hợp lệ"),
    status: z.enum(statuses, { error: "Trạng thái không hợp lệ" }),
    total_amount: amountSchema,
    note: z.string().trim().max(2000, "Ghi chú tối đa 2.000 ký tự").default(""),
  })
  .strict();
export type LiveOrderInput = z.infer<typeof liveOrderInput>;
export type LiveOrder = LiveOrderInput & {
  id: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
};
export const profileSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  email: z.email(),
  role: z.enum(roles),
  is_active: z.boolean(),
});
export type Profile = z.infer<typeof profileSchema>;
export const filterSchema = z
  .object({
    from: z
      .string()
      .refine((v) => !v || isISODate(v))
      .default(""),
    to: z
      .string()
      .refine((v) => !v || isISODate(v))
      .default(""),
    status: z.enum([...statuses, "all"]).default("all"),
    search: z.string().max(200).default(""),
  })
  .refine(
    (v) => !v.from || !v.to || v.from <= v.to,
    "Khoảng ngày không hợp lệ",
  );
export const listSchema = filterSchema.and(
  z.object({
    visibility: z.enum(["all", "active", "hidden"]).default("all"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    sort: z
      .enum([
        "order_date",
        "total_amount",
        "order_code",
        "customer_name",
        "status",
      ])
      .default("order_date"),
    direction: z.enum(["asc", "desc"]).default("desc"),
  }),
);
export const exactMoney = (value: string | bigint) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(BigInt(value));
export function safeCSV(rows: LiveOrder[]) {
  const fields = [
    "order_code",
    "customer_name",
    "order_date",
    "status",
    "total_amount",
    "note",
    "updated_at",
  ] as const;
  const escape = (value: string) =>
    '"' +
    (/^[\s]*[=+\-@\t\r\n]/.test(value) ? "'" + value : value).replaceAll(
      '"',
      '""',
    ) +
    '"';
  return (
    "\uFEFF" +
    [
      fields.join(","),
      ...rows.map((o) => fields.map((f) => escape(o[f])).join(",")),
    ].join("\r\n")
  );
}
