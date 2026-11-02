import { previewImport } from "@/lib/server/sheets";
import { checkOrigin, fail, json, requireActor } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { db } = await requireActor(["admin"], "sync");
    const { data: canImport, error } = await db.rpc("can_import");
    if (error) throw error;
    return json({ ...(await previewImport()), canImport });
  } catch (e) {
    return fail(e);
  }
}
