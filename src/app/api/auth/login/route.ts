import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import {
  body,
  checkOrigin,
  fail,
  HttpError,
  json,
  requireActor,
} from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = z
      .object({ email: z.email(), password: z.string().min(1).max(200) })
      .parse(await body(request));
    const db = await serverClient();
    const { error } = await db.auth.signInWithPassword(input);
    if (error) throw new HttpError(401, "Email hoặc mật khẩu không đúng.");
    try {
      await requireActor();
    } catch (e) {
      await db.auth.signOut();
      throw e;
    }
    return json({ authenticated: true });
  } catch (e) {
    return fail(e);
  }
}
