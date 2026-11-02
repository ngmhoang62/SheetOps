import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { filterSchema, listSchema } from "@/lib/contracts";
export function params(request: Request) {
  return Object.fromEntries(new URL(request.url).searchParams);
}
export const orderFields =
  "id,order_code,customer_name,order_date,status,total_amount,note,created_at,updated_at,updated_by,deleted_at";
export function filtered(db: SupabaseClient, raw: unknown) {
  const f = filterSchema.parse(raw);
  let q = db
    .from("orders_api")
    .select(orderFields, { count: "exact" })
    .is("deleted_at", null);
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
  const result = await filtered(db, p)
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
