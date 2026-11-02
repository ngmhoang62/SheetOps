"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/workspace-provider";
export default function Accept() {
  const { refresh } = useWorkspace();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const db = browserClient();
    void db.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
      if (!data.session)
        setError(
          "Lời mời không hợp lệ hoặc đã hết hạn. Hãy mở lại liên kết trong email.",
        );
    });
  }, []);
  return (
    <section className="login-form">
      <h1>Thiết lập mật khẩu</h1>
      <p>Hoàn tất tài khoản đã được quản trị viên mời.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await browserClient().auth.updateUser({ password });
          if (error) {
            setError(
              "Không thể đặt mật khẩu. Mật khẩu cần đủ mạnh và khác mật khẩu cũ.",
            );
            return;
          }
          await refresh();
          router.replace("/dashboard");
          router.refresh();
        }}
      >
        <label className="field">
          Mật khẩu mới
          <input
            type="password"
            minLength={12}
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
        <Button type="submit" disabled={!ready}>
          Lưu mật khẩu
        </Button>
      </form>
    </section>
  );
}
