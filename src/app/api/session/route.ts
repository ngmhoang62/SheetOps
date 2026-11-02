import { fail, json, requireActor } from "@/lib/server/http";
export async function GET() {
  try {
    const { db, profile } = await requireActor();
    const { data, error } = await db
      .from("workspace_settings")
      .select("organization")
      .single();
    if (error) throw error;
    return json({ profile, organization: data.organization });
  } catch (e) {
    return fail(e);
  }
}
