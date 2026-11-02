import { filterSchema } from "@/lib/contracts";
import { fail, json, requireActor } from "@/lib/server/http";
import { params } from "@/lib/server/orders";
export async function GET(request: Request) {
  try {
    const { db } = await requireActor();
    const f = filterSchema.parse(params(request));
    const { data, error } = await db.rpc("analytics_summary", {
      date_from: f.from || null,
      date_to: f.to || null,
      status_filter: f.status === "all" ? null : f.status,
    });
    if (error) throw error;
    return json(data);
  } catch (e) {
    return fail(e);
  }
}
