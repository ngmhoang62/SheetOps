import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { backendTarget, deploymentStaging } from "./lib/environment";
import { upstreamFetch } from "./lib/supabase/transport";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    return new NextResponse("Chưa cấu hình dịch vụ xác thực.", { status: 503 });
  try {
    backendTarget(
      url,
      deploymentStaging(process.env),
      process.env.NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF,
    );
  } catch {
    return new NextResponse("Môi trường chưa được cấu hình backend độc lập.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  // Route handlers authenticate with their own cookie-aware client. Avoid a second
  // Auth network round trip here; cron also owns its bearer authentication.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const db = createServerClient(url, key, {
    global: { fetch: upstreamFetch },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([k, v]) =>
          response.headers.set(k, v),
        );
      },
    },
  });
  // Supabase recommends signature-verified claims for page protection.
  // Application role/disable state is still read fresh below on every request.
  const { data, error } = await db.auth.getClaims();
  if (error && (error.status === 0 || (error.status ?? 0) >= 500))
    return new NextResponse(
      "Dịch vụ xác thực tạm thời không khả dụng. Vui lòng thử lại.",
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  const userId = error ? undefined : data?.claims.sub;
  const path = request.nextUrl.pathname;
  const publicPath = path === "/login" || path.startsWith("/auth/");
  // APIs own their structured authentication and cron checks; never authorize from client state.
  const revokedLogin =
    path === "/login" &&
    ["account_disabled", "account_unavailable"].includes(
      request.nextUrl.searchParams.get("reason") ?? "",
    );
  if (!path.startsWith("/api/") && (!publicPath || revokedLogin)) {
    if (!userId) {
      if (publicPath) {
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
      const r = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.getAll().forEach((c) => r.cookies.set(c));
      return r;
    }
    const { data: p, error: profileError } = await db
      .from("profiles")
      .select("role,is_active")
      .eq("id", userId)
      .single();
    if (profileError && profileError.code !== "PGRST116") {
      const unavailable = new NextResponse(
        "Không thể kiểm tra quyền truy cập lúc này. Vui lòng thử lại.",
        { status: 503, headers: { "Cache-Control": "private, no-store" } },
      );
      response.cookies
        .getAll()
        .forEach((cookie) => unavailable.cookies.set(cookie));
      return unavailable;
    }
    if (!p?.is_active) {
      // End only this browser's session; other users/sessions are untouched.
      await db.auth.signOut({ scope: "local" }).catch(() => undefined);
      const target = new URL("/login", request.url);
      target.searchParams.set(
        "reason",
        p ? "account_disabled" : "account_unavailable",
      );
      const redirect = NextResponse.redirect(target);
      response.cookies
        .getAll()
        .forEach((cookie) => redirect.cookies.set(cookie));
      // Also expire existing chunks if the Auth logout service was unavailable.
      const prefix = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
      request.cookies
        .getAll()
        .filter(
          ({ name }) =>
            name === prefix ||
            name.startsWith(prefix + ".") ||
            name.startsWith(prefix + "-"),
        )
        .forEach(({ name }) =>
          redirect.cookies.set(name, "", { path: "/", maxAge: 0 }),
        );
      redirect.headers.set("Cache-Control", "private, no-store");
      return redirect;
    }
    if (
      ["/users", "/sync", "/settings"].some(
        (v) => path === v || path.startsWith(v + "/"),
      ) &&
      p.role !== "admin"
    )
      return new NextResponse("Bạn không có quyền truy cập.", {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      });
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)",
  ],
};
