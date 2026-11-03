import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, url.origin));
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  // Optional invitation-template callback; keep the OTP type fixed to invite.
  if (tokenHash && url.searchParams.get("type") === "invite" && !code) {
    const { error } = await (
      await serverClient()
    ).auth.verifyOtp({
      token_hash: tokenHash,
      type: "invite",
    });
    return redirect(error ? "/login?error=invalid_invitation" : "/auth/accept");
  }
  if (code) {
    const { error } = await (
      await serverClient()
    ).auth.exchangeCodeForSession(code);
    if (!error) return redirect("/auth/accept");
  }
  return redirect("/login?error=invalid_invitation");
}
