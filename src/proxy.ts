import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    return new NextResponse("Chưa cấu hình dịch vụ xác thực.", { status: 503 });
  const db = createServerClient(url, key, {
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
  const {
    data: { user },
  } = await db.auth.getUser();
  const path = request.nextUrl.pathname;
  const publicPath = path === "/login" || path.startsWith("/auth/");
  // APIs own their structured authentication and cron checks; never authorize from client state.
  if (!path.startsWith("/api/") && !publicPath) {
    if (!user) {
      const r = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.getAll().forEach((c) => r.cookies.set(c));
      return r;
    }
    const { data: p } = await db
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .single();
    if (
      !p?.is_active ||
      (["/users", "/sync", "/settings"].some(
        (v) => path === v || path.startsWith(v + "/"),
      ) &&
        p.role !== "admin")
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
