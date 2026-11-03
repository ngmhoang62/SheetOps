import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/contracts";
import type { Role } from "@/lib/domain";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "REQUEST_FAILED",
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(
    { data },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
export function fail(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: "Thông tin không hợp lệ",
          fields: error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  const code = (error as { code?: string })?.code;
  const status =
    code === "23505"
      ? 409
      : code === "42501"
        ? 403
        : code === "23514" || code === "22007"
          ? 422
          : 500;
  return NextResponse.json(
    {
      error: {
        code: code ?? "SERVER_ERROR",
        message:
          status === 409
            ? "Dữ liệu đã tồn tại hoặc một tác vụ đang chạy."
            : status === 403
              ? "Bạn không có quyền thực hiện thao tác."
              : status === 422
                ? "Dữ liệu vi phạm quy tắc nghiệp vụ."
                : "Không thể xử lý yêu cầu. Vui lòng thử lại.",
      },
    },
    { status },
  );
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const target = new URL(request.url);
  // Next's local server may reconstruct request.url with localhost while Host is 127.0.0.1.
  // Host is browser-controlled by navigation, unlike caller-provided forwarding headers.
  const host = request.headers.get("host");
  const sameHost = host && origin === `${target.protocol}//${host}`;
  if (!origin || (origin !== target.origin && !sameHost))
    throw new HttpError(403, "Nguồn yêu cầu không hợp lệ.");
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 1_000_000)
    throw new HttpError(413, "Yêu cầu quá lớn.");
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "JSON không hợp lệ.");
  }
}
export async function requireActor(
  allowed?: Role[],
  bucket?: "orders" | "admin" | "sync",
) {
  const db = await serverClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Vui lòng đăng nhập.");
  const result = await db
    .from("profiles")
    .select("id,full_name,email,role,is_active")
    .eq("id", data.user.id)
    .single();
  if (result.error || !result.data?.is_active)
    throw new HttpError(
      403,
      "Tài khoản chưa được cấp quyền hoặc đã vô hiệu hóa.",
      result.data ? "ACCOUNT_DISABLED" : "ACCOUNT_UNAVAILABLE",
    );
  const profile = profileSchema.parse(result.data);
  if (allowed && !allowed.includes(profile.role))
    throw new HttpError(403, "Bạn không có quyền truy cập.");
  if (bucket) {
    const quota = await db.rpc("consume_mutation", { bucket_input: bucket });
    if (quota.error) throw quota.error;
    if (!quota.data)
      throw new HttpError(
        429,
        "Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút.",
      );
  }
  return { db, profile };
}
