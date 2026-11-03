import { fail, json, readAsActor } from "@/lib/server/http";
export async function GET() {
  try {
    const {
      profile,
      result: { data, error },
      timings,
    } = await readAsActor((db) =>
      db.from("workspace_settings").select("organization").single(),
    );
    if (error) throw error;
    return json({ profile, organization: data.organization }, 200, timings);
  } catch (e) {
    return fail(e);
  }
}
