import { fail, json, requireActor } from "@/lib/server/http";
export async function GET() {
  try {
    const { db } = await requireActor(["admin"]);
    const { data, error } = await db
      .from("audit_logs")
      .select("id,actor_id,action,resource_type,resource_id,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return json(data);
  } catch (e) {
    return fail(e);
  }
}
