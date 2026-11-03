import { fail, json, readAsActor } from "@/lib/server/http";
export async function GET() {
  try {
    const {
      result: { data, error },
      timings,
    } = await readAsActor(
      (db) =>
        db
          .from("audit_logs")
          .select("id,actor_id,action,resource_type,resource_id,created_at")
          .order("created_at", { ascending: false })
          .limit(100),
      ["admin"],
    );
    if (error) throw error;
    return json(data, 200, timings);
  } catch (e) {
    return fail(e);
  }
}
