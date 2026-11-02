import { fail, json, requireActor } from "@/lib/server/http";
export async function GET() {
  try {
    const { db } = await requireActor(["admin"]);
    const { data, error } = await db
      .from("sync_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return json(data);
  } catch (e) {
    return fail(e);
  }
}
