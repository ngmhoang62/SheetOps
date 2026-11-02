import { z } from "zod";
import { body, checkOrigin, fail, json, requireActor } from "@/lib/server/http";
export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    const { db } = await requireActor(["admin"], "admin");
    const input = z
      .object({ organization: z.string().trim().min(1).max(100) })
      .strict()
      .parse(await body(request));
    const { error } = await db
      .from("workspace_settings")
      .update(input)
      .eq("id", true);
    if (error) throw error;
    return json(input);
  } catch (e) {
    return fail(e);
  }
}
