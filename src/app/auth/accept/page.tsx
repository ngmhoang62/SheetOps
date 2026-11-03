"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { acceptInvitationSession } from "@/lib/invitations";
import { browserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/workspace-provider";
export default function Accept() {
  const { establish, logout } = useWorkspace();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const initialization = useRef<Promise<boolean> | null>(null);
  useEffect(() => {
    let active = true;
    if (!initialization.current) {
      const fragment = window.location.hash;
      // Remove credentials from the address bar before client initialization.
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname,
      );
      initialization.current = (async () => {
        const valid = await acceptInvitationSession(
          browserClient().auth,
          fragment,
        );
        if (!valid) return false;
        // Fresh server-side profile check also rejects disabled/unprovisioned users.
        const response = await fetch("/api/session", { cache: "no-store" });
        if (!response.ok) return false;
        establish((await response.json()).data);
        return true;
      })().catch(() => false);
    }
    void initialization.current.then((valid) => {
      if (!active) return;
      setReady(valid);
      if (!valid)
        setError(
          "Lời mời không hợp lệ, đã hết hạn hoặc tài khoản chưa được cấp quyền. Hãy mở lại liên kết trong email hoặc liên hệ quản trị viên.",
        );
    });
    return () => {
      active = false;
    };
  }, [establish]);
  return (
    <section className="login-form">
      <h1>Thiết lập mật khẩu</h1>
      <p>Hoàn tất tài khoản đã được quản trị viên mời.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!ready || pending) return;
          setPending(true);
          setError("");
          try {
            const allowed = await fetch("/api/session", { cache: "no-store" });
            if (!allowed.ok) throw new Error("Account unavailable");
            const { error } = await browserClient().auth.updateUser({
              password,
            });
            if (error) throw error;
            setPassword("");
            setReady(false);
            try {
              await logout();
            } catch {
              setError(
                "Mật khẩu đã được lưu nhưng chưa đăng xuất được. Hãy thử đăng xuất lại trước khi đăng nhập bằng mật khẩu mới.",
              );
              return;
            }
            router.replace("/login?reason=password_set");
          } catch {
            setError(
              "Không thể đặt mật khẩu. Mật khẩu cần đủ mạnh và khác mật khẩu cũ.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="field">
          Mật khẩu mới
          <input
            type="password"
            minLength={12}
            maxLength={72}
            disabled={!ready || pending}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={!ready || pending}>
          {pending ? "Đang lưu…" : "Lưu mật khẩu"}
        </Button>
      </form>
    </section>
  );
}
