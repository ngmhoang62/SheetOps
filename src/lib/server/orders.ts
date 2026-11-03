import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { filterSchema, listSchema } from "@/lib/contracts";
export function params(request: Request) {
  return Object.fromEntries(new URL(request.url).searchParams);
}
export const orderFields =
  "id,order_code,customer_name,order_date,status,total_amount,note,created_at,updated_at,updated_by,deleted_at";
export function filtered(
  db: SupabaseClient,
  raw: unknown,
  visibility: "all" | "active" | "hidden" = "active",
) {
  const f = filterSchema.parse(raw);
  let q = db.from("orders_api").select(orderFields, { count: "exact" });
  if (visibility === "active") q = q.is("deleted_at", null);
  if (visibility === "hidden") q = q.not("deleted_at", "is", null);
  if (f.from) q = q.gte("order_date", f.from);
  if (f.to) q = q.lte("order_date", f.to);
  if (f.status !== "all") q = q.eq("status", f.status);
  if (f.search) {
    const s = f.search.replace(/[,%_()\\]/g, " ").trim();
    if (s) q = q.or(`order_code.ilike.%${s}%,customer_name.ilike.%${s}%`);
  }
  return q;
}
export async function listOrders(db: SupabaseClient, raw: unknown) {
  const p = listSchema.parse(raw);
  const result = await filtered(db, p, p.visibility)
    .order("deleted_at", { ascending: true, nullsFirst: true })
    .order(p.sort === "total_amount" ? "amount_sort" : p.sort, {
      ascending: p.direction === "asc",
    })
    .order("id")
    .range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1);
  if (result.error) throw result.error;
  return {
    orders: result.data,
    total: result.count ?? 0,
    page: p.page,
    pageSize: p.pageSize,
  };
}
