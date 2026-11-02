import { fail, json, requireActor } from "@/lib/server/http";
export async function GET() {
  try {
    const { db } = await requireActor(["admin"]);
    const { data, error } = await db
      .from("profiles")
      .select("id,full_name,email,role,is_active")
      .order("created_at");
    if (error) throw error;
    return json(data);
  } catch (e) {
    return fail(e);
  }
}
