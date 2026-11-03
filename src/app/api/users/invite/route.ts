import {
  body,
  checkOrigin,
  fail,
  HttpError,
  json,
  requireActor,
} from "@/lib/server/http";
import { invitationFailure, invitationOrigin } from "@/lib/invitations";
import { inviteSchema } from "@/lib/server/users";
import { privilegedClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { db } = await requireActor(["admin"], "admin");
    const input = inviteSchema.parse(await body(request));
    const origin = invitationOrigin(
      process.env.APP_ORIGIN,
      process.env.VERCEL_ENV === "production",
    );
    if (!origin)
      throw new HttpError(
        503,
        "APP_ORIGIN chưa được cấu hình đúng. Quản trị viên cần kiểm tra URL ứng dụng.",
        "INVITE_CONFIGURATION",
      );
    const inviteStarted = performance.now();
    const { data, error } =
      await privilegedClient().auth.admin.inviteUserByEmail(input.email, {
        redirectTo: new URL("/auth/accept", origin).href,
        data: { full_name: input.full_name },
      });
    const inviteMs = performance.now() - inviteStarted;
    if (error) {
      const failure = invitationFailure(error);
      console.warn(
        JSON.stringify({
          event: "invitation_failed",
          stage: "auth",
          code: failure.code,
          providerStatus: error.status ?? null,
        }),
      );
      throw new HttpError(failure.status, failure.message, failure.code);
    }
    const saved = await db.rpc("manage_profile", {
      target: data.user.id,
      full_name_input: input.full_name,
      email_input: input.email.toLowerCase(),
      role_input: input.role,
      active_input: true,
    });
    // If profile provisioning fails, no permission is granted. Retrying can be handled through Admin recovery.
    if (saved.error) {
      console.warn(
        JSON.stringify({
          event: "invitation_failed",
          stage: "profile",
          code: "INVITE_PROFILE_FAILED",
        }),
      );
      throw new HttpError(
        500,
        "Supabase đã tiếp nhận lời mời nhưng chưa cấp được quyền ứng dụng. Liên hệ quản trị viên để kiểm tra profile; không gửi lại liên tục.",
        "INVITE_PROFILE_FAILED",
      );
    }
    return json(
      {
        profileId: data.user.id,
        message:
          "Supabase đã tiếp nhận lời mời. Chưa xác minh thư đã đến hộp thư người nhận.",
        delivery: "unverified",
      },
      201,
      {
        invitation: inviteMs,
        provision: performance.now() - inviteStarted - inviteMs,
      },
    );
  } catch (e) {
    return fail(e);
  }
}
