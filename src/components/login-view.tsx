"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet, ArrowUpRight } from "lucide-react";
import { api } from "./resource";
import { type WorkspaceSession, useWorkspace } from "./workspace-provider";
import { Button } from "./ui/button";
import { loginNotice } from "@/lib/access-notice";
export function LoginPage({ reason }: { reason?: string }) {
  const { establish } = useWorkspace();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="login-page">
      <div className="login-story">
        <div className="brand">
          <span className="brand-symbol">
            <Sheet size={26} />
          </span>
          SheetOps
        </div>
        <div>
          <span className="eyebrow">MỌI HOẠT ĐỘNG. MỘT GÓC NHÌN.</span>
          <h1>
            Vận hành rõ ràng.
            <br />
            Quyết định tự tin.
          </h1>
          <p>Quản lý đơn hàng và doanh thu trong không gian nội bộ của bạn.</p>
        </div>
        <small>SheetOps · Hệ thống nội bộ</small>
      </div>
      <section className="login-form">
        <span className="section-kicker">CHÀO MỪNG ĐẾN SHEETOPS</span>
        <h2>Đăng nhập</h2>
        <p>Sử dụng tài khoản được quản trị viên cấp.</p>
        {loginNotice(reason) && (
          <p className="notice notice-error" role="alert">
            {loginNotice(reason)}
          </p>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError("");
            try {
              const session = await api<WorkspaceSession>("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
              });
              establish(session);
              router.replace("/dashboard");
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Đăng nhập thất bại.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <label className="field">
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
          </label>
          <label className="field">
            Mật khẩu
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
            />
          </label>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Đang đăng nhập…" : "Đăng nhập"}
            <ArrowUpRight size={17} />
          </Button>
        </form>
        <small className="muted">
          Không có đăng ký công khai. Liên hệ quản trị viên để được cấp quyền.
        </small>
      </section>
    </div>
  );
}
