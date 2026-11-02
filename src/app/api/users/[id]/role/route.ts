import { z } from "zod";
import { roles } from "@/lib/domain";
import {
  body,
  checkOrigin,
  fail,
  HttpError,
  json,
  requireActor,
} from "@/lib/server/http";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const { db } = await requireActor(["admin"], "admin");
    const { id } = await params;
    z.uuid().parse(id);
    const input = z
      .object({ role: z.enum(roles) })
      .strict()
      .parse(await body(request));
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) throw new HttpError(404, "Không tìm thấy người dùng.");
    const result = await db.rpc("manage_profile", {
      target: id,
      full_name_input: data.full_name,
      email_input: data.email,
      role_input: input.role,
      active_input: data.is_active,
    });
    if (result.error) throw result.error;
    return json({ updated: true });
  } catch (e) {
    return fail(e);
  }
}
