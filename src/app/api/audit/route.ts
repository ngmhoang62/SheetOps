import { fail, json, readAsActor } from "@/lib/server/http";
import { auditQuery } from "@/lib/audit";
import { params } from "@/lib/server/orders";
export async function GET(request: Request) {
  try {
    const input = auditQuery.parse(params(request));
    const {
      result: { data, error },
      timings,
    } = await readAsActor(
      (db) =>
        db.rpc("audit_page", {
          page_input: input.page,
          size_input: input.pageSize,
          role_input: input.role === "all" ? null : input.role,
          action_input: input.action === "all" ? null : input.action,
          resource_input: input.resource === "all" ? null : input.resource,
          date_from: input.from || null,
          date_to: input.to || null,
          query_input: input.search || null,
        }),
      ["admin"],
    );
    if (error) throw error;
    return json(data, 200, timings);
  } catch (e) {
    return fail(e);
  }
}
