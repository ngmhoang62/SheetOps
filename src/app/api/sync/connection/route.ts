import { connection } from "@/lib/server/sheets";
import { fail, json, requireActor } from "@/lib/server/http";
export async function GET() {
  try {
    await requireActor(["admin"], "sync");
    return json(await connection());
  } catch (e) {
    return fail(e);
  }
}
