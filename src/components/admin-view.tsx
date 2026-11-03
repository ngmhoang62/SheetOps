"use client";
import { useState } from "react";
import { AuditView } from "./audit-view";
import { toast } from "sonner";
import { roleLabels, roles, type Role } from "@/lib/domain";
import type { Profile } from "@/lib/contracts";
import { formatTime } from "@/lib/analytics";
import { useWorkspace } from "./workspace-provider";
import { useQueryClient } from "@tanstack/react-query";
import { api, useResource } from "./resource";
import { ConfirmDialog, EmptyState, PageHeading } from "./shared";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
function Notice({ loading, error }: { loading: boolean; error: string }) {
  return loading ? (
    <div className="notice" role="status">
      Đang tải dữ liệu…
    </div>
  ) : error ? (
    <div className="notice notice-error" role="alert">
      {error}
    </div>
  ) : null;
}
const message = (e: unknown) =>
  e instanceof Error ? e.message : "Không thể thực hiện thao tác.";
export function UsersView() {
  const { user, revision, changed } = useWorkspace();
  const resource = useResource<Profile[]>("/api/users", revision);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "viewer" as Role,
  });
  const [error, setError] = useState("");
  const [change, setChange] = useState<{
    p: Profile;
    role?: Role;
    is_active?: boolean;
  } | null>(null);
  return (
    <>
      <PageHeading
        kicker="QUẢN TRỊ KHÔNG GIAN"
        title="Người dùng & vai trò"
        description=""
      >
        <Button onClick={() => setOpen(true)}>Mời người dùng</Button>
      </PageHeading>
      <Notice {...resource} />
      <section className="panel">
        <div className="panel-heading">
          <h2>Thành viên không gian</h2>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {resource.data?.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.full_name}
                    {p.id === user?.id && (
                      <span className="count-pill">Bạn</span>
                    )}
                  </td>
                  <td>{p.email}</td>
                  <td>
                    <select
                      aria-label={`Vai trò ${p.email}`}
                      disabled={p.id === user?.id || pending}
                      value={p.role}
                      onChange={(e) =>
                        setChange({ p, role: e.target.value as Role })
                      }
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {roleLabels[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{p.is_active ? "Hoạt động" : "Vô hiệu hóa"}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={p.id === user?.id || pending}
                      onClick={() => setChange({ p, is_active: !p.is_active })}
                    >
                      {p.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Mời người dùng</DialogTitle>
          <DialogDescription>
            Gửi liên kết để người nhận thiết lập mật khẩu. Sau khi gửi, hãy kiểm
            tra hộp thư và thư rác; hệ thống chưa tự xác minh thư đã đến.
          </DialogDescription>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setError("");
              try {
                const result = await api<{ message: string }>(
                  "/api/users/invite",
                  { method: "POST", body: JSON.stringify(form) },
                );
                toast.info(result.message);
                setOpen(false);
                changed("users");
              } catch (e) {
                setError(message(e));
              } finally {
                setPending(false);
              }
            }}
          >
            <div className="form-grid">
              <label className="field full-width">
                Họ và tên
                <input
                  required
                  maxLength={200}
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                />
              </label>
              <label className="field full-width">
                Email
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="field full-width">
                Vai trò
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as Role })
                  }
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Đang gửi…" : "Gửi lời mời"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!change}
        onOpenChange={(v) => {
          if (!v && !pending) setChange(null);
        }}
        title="Cập nhật quyền truy cập?"
        description={
          change
            ? `${change.p.full_name}: ${change.role ? roleLabels[change.role] : change.is_active ? "Kích hoạt" : "Vô hiệu hóa"}. Quyền mới áp dụng ở lần kiểm tra tiếp theo.`
            : ""
        }
        onConfirm={async () => {
          if (!change || pending) return;
          setPending(true);
          try {
            await api(
              `/api/users/${change.p.id}/${change.role ? "role" : "disable"}`,
              {
                method: change.role ? "PATCH" : "POST",
                body: JSON.stringify(
                  change.role
                    ? { role: change.role }
                    : { is_active: change.is_active },
                ),
              },
            );
            changed("users");
            setChange(null);
            toast.success("Đã cập nhật quyền.");
          } catch (e) {
            toast.error(message(e));
          } finally {
            setPending(false);
          }
        }}
      />
    </>
  );
}
type Run = {
  id: string;
  job_type: string;
  trigger_type: string;
  status: string;
  row_count: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};
type Preview = {
  rowCount: number;
  errors: { row: number; message: string }[];
  hash: string;
  canImport: boolean;
};
export function SyncView() {
  const { revision, changed } = useWorkspace();
  const runs = useResource<Run[]>("/api/sync/runs", revision);
  const client = useQueryClient();
  const connectionResource = useResource<{ tabs: string[] }>(
    "/api/sync/connection",
    0,
    false,
  );
  const connection = connectionResource.data;
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  async function action(kind: string) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      if (kind === "connection") {
        client.setQueryData(
          ["/api/sync/connection"],
          await api("/api/sync/connection"),
        );
        toast.success("Đã kiểm tra kết nối thực tế.");
      }
      if (kind === "preview")
        setPreview(await api("/api/sync/import/preview", { method: "POST" }));
      if (kind === "export") {
        await api("/api/sync/export", { method: "POST" });
        toast.success("Đã xuất và kiểm chứng dữ liệu.");
        changed("sync");
      }
      if (kind === "import" && preview) {
        await api("/api/sync/import/confirm", {
          method: "POST",
          body: JSON.stringify({ hash: preview.hash }),
        });
        setPreview(null);
        setConfirm(false);
        changed("sync");
        toast.success("Đã nhập dữ liệu vào PostgreSQL.");
      }
    } catch (e) {
      setError(message(e));
      changed("sync");
    } finally {
      setPending(false);
    }
  }
  const success = runs.data?.find(
    (r) => r.job_type === "export" && r.status === "success",
  );
  const failed = runs.data?.find(
    (r) => r.job_type === "export" && r.status === "failed",
  );
  return (
    <>
      <PageHeading
        kicker="KẾT NỐI & ĐỒNG BỘ"
        title="Trung tâm đồng bộ"
        description=""
      >
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => action("connection")}
        >
          Kiểm tra kết nối
        </Button>
      </PageHeading>
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      <Notice loading={pending || runs.loading} error={runs.error} />
      <div className="sync-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Google Sheets</h2>
            <span className="outline-pill">
              {connection ? "Đã kiểm tra kết nối" : "Chưa kiểm tra kết nối"}
            </span>
          </div>
          <div className="connection-body">
            <dl className="detail-list">
              <div>
                <dt>Các tab</dt>
                <dd>{connection?.tabs.join(", ") ?? "Chưa đọc thông tin"}</dd>
              </div>
              <div>
                <dt>Xuất thành công gần nhất</dt>
                <dd>
                  {success ? formatTime(success.finished_at!) : "Chưa có"}
                </dd>
              </div>
              <div>
                <dt>Xuất thất bại gần nhất</dt>
                <dd>{failed ? formatTime(failed.finished_at!) : "Chưa có"}</dd>
              </div>
              <div>
                <dt>Số dòng xuất thành công</dt>
                <dd>{success?.row_count ?? 0}</dd>
              </div>
              <div>
                <dt>Lịch tự động</dt>
                <dd>23:00 · Asia/Ho_Chi_Minh</dd>
              </div>
            </dl>
            <div className="connection-actions">
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => action("preview")}
              >
                Xem trước nhập
              </Button>
              <Button disabled={pending} onClick={() => action("export")}>
                Xuất lên Sheets
              </Button>
            </div>
            <p className="table-note">
              Chỉ nhập khi Orders hoàn toàn trống. Source_Orders không bị ghi
              đè. Bản xuất dùng staging và kiểm chứng nội dung.
            </p>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Kết quả xem trước</h2>
          </div>
          {preview ? (
            <div className="connection-body">
              <p>
                {preview.rowCount} dòng hợp lệ · {preview.errors.length} lỗi
              </p>
              {!preview.canImport && (
                <p className="field-error">
                  Orders đã có dữ liệu; không thể nhập ban đầu.
                </p>
              )}
              {preview.errors.map((e, i) => (
                <p className="field-error" key={i}>
                  Dòng {e.row}: {e.message}
                </p>
              ))}
              <Button
                disabled={
                  pending ||
                  !preview.canImport ||
                  !!preview.errors.length ||
                  !preview.rowCount
                }
                onClick={() => setConfirm(true)}
              >
                Xác nhận nhập {preview.rowCount} đơn
              </Button>
            </div>
          ) : (
            <EmptyState
              title="Chưa xem trước dữ liệu"
              description="Kiểm tra toàn bộ bảng nguồn trước khi nhập."
            />
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Lịch sử đồng bộ</h2>
        </div>
        {runs.data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Tác vụ</th>
                  <th>Nguồn kích hoạt</th>
                  <th>Trạng thái</th>
                  <th>Số dòng</th>
                  <th>Chi tiết lỗi</th>
                </tr>
              </thead>
              <tbody>
                {runs.data.map((r) => (
                  <tr key={r.id}>
                    <td>{formatTime(r.started_at)}</td>
                    <td>{r.job_type === "import" ? "Nhập" : "Xuất"}</td>
                    <td>
                      {r.trigger_type === "cron" ? "Tự động" : "Thủ công"}
                    </td>
                    <td>
                      {{
                        success: "Thành công",
                        failed: "Thất bại",
                        running: "Đang chạy",
                      }[r.status] ?? r.status}
                    </td>
                    <td>{r.row_count}</td>
                    <td>{r.error_message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !runs.loading && (
            <EmptyState
              title="Chưa có tác vụ đồng bộ"
              description="Chỉ các lần nhập/xuất thực tế được ghi nhận."
            />
          )
        )}
      </section>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Nhập dữ liệu ban đầu?"
        description={`Nhập ${preview?.rowCount ?? 0} đơn từ Source_Orders. Nếu nguồn thay đổi hoặc Orders không trống, hệ thống từ chối toàn bộ batch.`}
        onConfirm={() => action("import")}
      />
    </>
  );
}
export function SettingsView() {
  const { organization, refresh, changed } = useWorkspace();
  const [name, setName] = useState(organization);
  const [pending, setPending] = useState(false);
  return (
    <>
      <PageHeading
        kicker="TÙY CHỈNH KHÔNG GIAN"
        title="Cài đặt"
        description=""
      />
      <section className="panel">
        <div className="panel-heading">
          <h2>Thông tin không gian</h2>
        </div>
        <form
          className="settings-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              await api("/api/settings", {
                method: "PATCH",
                body: JSON.stringify({ organization: name }),
              });
              await refresh();
              changed("settings");
              toast.success("Đã lưu cài đặt.");
            } catch (e) {
              toast.error(message(e));
            } finally {
              setPending(false);
            }
          }}
        >
          <label className="field">
            Tên không gian
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            Múi giờ
            <input readOnly value="Asia/Ho_Chi_Minh (UTC+7)" />
          </label>
          <label className="field">
            Đơn vị tiền tệ
            <input readOnly value="VND · Số nguyên" />
          </label>
          <Button type="submit" disabled={pending}>
            Lưu thay đổi
          </Button>
        </form>
      </section>
      <AuditView />
    </>
  );
}
