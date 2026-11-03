import {
  body,
  checkOrigin,
  fail,
  json,
  requireActor,
  readAsActor,
} from "@/lib/server/http";
import { listOrders, params } from "@/lib/server/orders";
import { liveOrderInput } from "@/lib/contracts";
export async function GET(request: Request) {
  try {
    const { result, timings } = await readAsActor((db) =>
      listOrders(db, params(request)),
    );
    return json(result, 200, timings);
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { db } = await requireActor(["admin", "editor"], "orders");
    const input = liveOrderInput.parse(await body(request));
    const { data, error } = await db
      .from("orders")
      .insert(input)
      .select("id")
      .single();
    if (error) throw error;
    return json(data, 201);
  } catch (e) {
    return fail(e);
  }
}
