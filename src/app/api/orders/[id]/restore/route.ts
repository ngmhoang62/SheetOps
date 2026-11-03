import { z } from "zod";
import {
  checkOrigin,
  fail,
  HttpError,
  json,
  requireActor,
} from "@/lib/server/http";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const { db } = await requireActor(["admin", "editor"], "orders");
    const { id } = await context.params;
    z.uuid().parse(id);
    const { data, error } = await db.rpc("set_order_visibility", {
      target: id,
      hidden_input: false,
    });
    if (error?.code === "P0002")
      throw new HttpError(404, "Không tìm thấy đơn hàng.");
    if (error) throw error;
    return json({ restored: true, changed: data });
  } catch (e) {
    return fail(e);
  }
}
