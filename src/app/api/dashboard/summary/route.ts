import { filterSchema } from "@/lib/contracts";
import { fail, json, readAsActor } from "@/lib/server/http";
import { params } from "@/lib/server/orders";
export async function GET(request: Request) {
  try {
    const f = filterSchema.parse(params(request));
    const {
      result: { data, error },
      timings,
    } = await readAsActor((db) =>
      db.rpc("analytics_summary", {
        date_from: f.from || null,
        date_to: f.to || null,
        status_filter: f.status === "all" ? null : f.status,
      }),
    );
    if (error) throw error;
    return json(data, 200, timings);
  } catch (e) {
    return fail(e);
  }
}
