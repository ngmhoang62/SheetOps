import { exportSnapshot } from "@/lib/server/sheets";
import { checkOrigin, fail, json, requireActor } from "@/lib/server/http";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { profile } = await requireActor(["admin"], "sync");
    return json(
      await exportSnapshot(
        "manual",
        profile.id,
        "manual:" + crypto.randomUUID(),
      ),
    );
  } catch (e) {
    return fail(e);
  }
}
