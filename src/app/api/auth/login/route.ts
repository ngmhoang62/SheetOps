import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import {
  body,
  checkOrigin,
  fail,
  HttpError,
  json,
  authorizeActor,
} from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = z
      .object({ email: z.email(), password: z.string().min(1).max(200) })
      .parse(await body(request));
    const db = await serverClient();
    const started = performance.now();
    const { data, error } = await db.auth.signInWithPassword(input);
    const authMs = performance.now() - started;
    if (error && (error.status === 0 || (error.status ?? 0) >= 500))
      throw new HttpError(
        503,
        "Dịch vụ đăng nhập tạm thời không khả dụng. Vui lòng thử lại.",
        "AUTH_UNAVAILABLE",
      );
    if (error?.status === 429)
      throw new HttpError(
        429,
        "Bạn đăng nhập quá nhanh. Vui lòng thử lại sau.",
        "AUTH_RATE_LIMITED",
      );
    if (error || !data.user)
      throw new HttpError(401, "Email hoặc mật khẩu không đúng.");
    try {
      const [{ profile }, settings, dashboard] = await Promise.all([
        authorizeActor(db, data.user.id),
        db.from("workspace_settings").select("organization").single(),
        db.rpc("analytics_summary", {
          date_from: null,
          date_to: null,
          status_filter: null,
        }),
      ]);
      if (settings.error) throw settings.error;
      // A failed optional initial read must not invalidate a valid login.
      // Dashboard will use its regular authorized endpoint if this read fails.
      return json(
        {
          profile,
          organization: settings.data.organization,
          ...(dashboard.error ? {} : { dashboard: dashboard.data }),
        },
        200,
        {
          password: authMs,
          profile: performance.now() - started - authMs,
          total: performance.now() - started,
        },
      );
    } catch (e) {
      await db.auth.signOut();
      throw e;
    }
  } catch (e) {
    return fail(e);
  }
}
