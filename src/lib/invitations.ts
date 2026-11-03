/** Safe public diagnostics; never return provider messages, addresses or tokens. */
export function invitationFailure(error: unknown) {
  const { status, code } = (error ?? {}) as { status?: number; code?: string };
  if (status === 504 || status === 0 || code === "request_timeout")
    return {
      status: 504,
      code: "INVITE_TIMEOUT",
      message:
        "Supabase xử lý lời mời quá thời gian chờ. Quản trị viên cần kiểm tra kết nối SMTP, host và port. Chưa xác minh thư đã gửi; kiểm tra hộp thư và danh sách người dùng trước khi thử lại.",
    };
  if (status === 429 || code === "over_email_send_rate_limit")
    return {
      status: 429,
      code: "INVITE_RATE_LIMIT",
      message: "Đã chạm giới hạn gửi lời mời. Vui lòng chờ trước khi thử lại.",
    };
  if (code === "email_exists" || code === "user_already_exists")
    return {
      status: 409,
      code: "INVITE_EXISTS",
      message:
        "Email đã có tài khoản. Kiểm tra thành viên hiện có trước khi cấp quyền hoặc gửi lại lời mời.",
    };
  return {
    status: 502,
    code: "INVITE_AUTH_FAILED",
    message:
      "Supabase không hoàn tất lời mời. Kiểm tra Auth logs và nhật ký email provider để phân biệt lỗi SMTP, từ chối thư hoặc cấu hình dịch vụ. Chưa xác minh thư đã gửi.",
  };
}

export function invitationOrigin(
  value: string | undefined,
  production: boolean,
) {
  try {
    const url = new URL(value ?? "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      (url.protocol !== "https:" &&
        !(url.protocol === "http:" && local && !production)) ||
      (production && local)
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

type InvitationAuth = {
  setSession: (tokens: {
    access_token: string;
    refresh_token: string;
  }) => Promise<{ error: unknown }>;
  getUser: () => Promise<{ data: { user: unknown }; error: unknown }>;
};

/** Invitations and explicit password recovery return verified implicit sessions. */
export async function acceptInvitationSession(
  auth: InvitationAuth,
  fragment: string,
) {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  if (params.has("error") || params.has("error_code")) return false;
  if (params.has("access_token") || params.has("refresh_token")) {
    if (!["invite", "recovery"].includes(params.get("type") ?? ""))
      return false;
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return false;
    const { error } = await auth.setSession({ access_token, refresh_token });
    if (error) return false;
  }
  const { data, error } = await auth.getUser();
  return !error && !!data.user;
}
