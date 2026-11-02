import { z } from "zod";
import { orderFields } from "@/lib/server/orders";
import { liveOrderInput } from "@/lib/contracts";
import {
  body,
  checkOrigin,
  fail,
  HttpError,
  json,
  requireActor,
} from "@/lib/server/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const { db } = await requireActor();
    const { id } = await context.params;
    z.uuid().parse(id);
    const { data, error } = await db
      .from("orders_api")
      .select(orderFields)
      .eq("id", id)
      .single();
    if (error || !data) throw new HttpError(404, "Không tìm thấy đơn hàng.");
    return json(data);
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const { db } = await requireActor(["admin", "editor"], "orders");
    const { id } = await context.params;
    z.uuid().parse(id);
    const input = liveOrderInput.parse(await body(request));
    const { data, error } = await db
      .from("orders")
      .update(input)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(404, "Không tìm thấy đơn hàng.");
    return json(data);
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const { db } = await requireActor(["admin", "editor"], "orders");
    const { id } = await context.params;
    z.uuid().parse(id);
    const { error } = await db.rpc("soft_delete_order", { target: id });
    if (error?.code === "P0002")
      throw new HttpError(404, "Không tìm thấy đơn hàng.");
    if (error) throw error;
    return json({ deleted: true });
  } catch (e) {
    return fail(e);
  }
}
