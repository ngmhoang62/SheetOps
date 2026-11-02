import { serverClient } from "@/lib/supabase/server";
import { checkOrigin, fail, json } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const db = await serverClient();
    const { error } = await db.auth.signOut();
    if (error) throw error;
    return json({ signedOut: true });
  } catch (e) {
    return fail(e);
  }
}
