import { fail, json, readAsActor } from "@/lib/server/http";
export async function GET() {
  try {
    const {
      result: { data, error },
      timings,
    } = await readAsActor(
      (db) =>
        db
          .from("profiles")
          .select("id,full_name,email,role,is_active")
          .order("created_at"),
      ["admin"],
    );
    if (error) throw error;
    return json(data, 200, timings);
  } catch (e) {
    return fail(e);
  }
}
