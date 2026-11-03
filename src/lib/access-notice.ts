export function loginNotice(reason: string | undefined) {
  switch (reason) {
    case "account_disabled":
      return "Tài khoản của bạn đã bị vô hiệu hóa. Liên hệ quản trị viên để được cấp lại quyền truy cập.";
    case "account_unavailable":
      return "Tài khoản chưa được cấp quyền hoặc đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.";
    case "password_set":
      return "Đã thiết lập mật khẩu. Vui lòng đăng nhập bằng email và mật khẩu mới.";
    case "session_expired":
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    default:
      return "";
  }
}
