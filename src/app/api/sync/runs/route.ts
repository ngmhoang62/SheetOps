import { fail, json, readAsActor } from "@/lib/server/http";
export async function GET() {
  try {
    const {
      result: { data, error },
      timings,
    } = await readAsActor(
      (db) =>
        db
          .from("sync_runs")
          .select(
            "id,job_type,trigger_type,status,row_count,error_message,started_at,finished_at",
          )
          .order("started_at", { ascending: false })
          .limit(50),
      ["admin"],
    );
    if (error) throw error;
    return json(data, 200, timings);
  } catch (e) {
    return fail(e);
  }
}
