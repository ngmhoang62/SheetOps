import { body, checkOrigin, fail, json, requireActor } from "@/lib/server/http";
import { inviteSchema } from "@/lib/server/users";
import { privilegedClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { db } = await requireActor(["admin"], "admin");
    const input = inviteSchema.parse(await body(request));
    const origin = process.env.APP_ORIGIN;
    if (!origin) throw new Error("APP_ORIGIN is required for invitations");
    const { data, error } =
      await privilegedClient().auth.admin.inviteUserByEmail(input.email, {
        redirectTo: new URL("/auth/accept", origin).href,
        data: { full_name: input.full_name },
      });
    if (error) throw error;
    const saved = await db.rpc("manage_profile", {
      target: data.user.id,
      full_name_input: input.full_name,
      email_input: input.email.toLowerCase(),
      role_input: input.role,
      active_input: true,
    });
    // If profile provisioning fails, no permission is granted. Retrying can be handled through Admin recovery.
    if (saved.error) throw saved.error;
    return json(
      {
        profileId: data.user.id,
        message:
          "Supabase đã tiếp nhận lời mời. Chưa xác minh thư đã đến hộp thư người nhận.",
        delivery: "unverified",
      },
      201,
    );
  } catch (e) {
    return fail(e);
  }
}
