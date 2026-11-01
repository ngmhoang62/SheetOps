"use client";
import { useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  Check,
  Clock3,
  FileSpreadsheet,
  Link2Off,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { formatTime } from "@/lib/analytics";
import { roleLabels, roles, type DemoUser, type Role } from "@/lib/domain";
import { useDemo } from "./demo-provider";
import { ConfirmDialog, EmptyState, PageHeading } from "./shared";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";

const invitationSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên")
    .max(200, "Tối đa 200 ký tự"),
  email: z.email("Email không hợp lệ"),
  role: z.enum(roles),
});
export function UsersView() {
  const { data, user, updateUser, inviteUser } = useDemo();
  const [inviting, setInviting] = useState(false);
  const [change, setChange] = useState<{
    profile: DemoUser;
    role?: Role;
    is_active?: boolean;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "viewer" as Role,
  });
  function invite(e: React.FormEvent) {
    e.preventDefault();
    const parsed = invitationSchema.safeParse({
      ...form,
      email: form.email.trim(),
    });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
        ),
      );
      return;
    }
    try {
      inviteUser(parsed.data.full_name, parsed.data.email, parsed.data.role);
      setInviting(false);
      setForm({ full_name: "", email: "", role: "viewer" });
      setErrors({});
      toast.success("Đã thêm người dùng demo. Không có email nào được gửi.");
    } catch (error) {
      setErrors({
        form:
          error instanceof Error ? error.message : "Không thể thêm người dùng.",
      });
    }
  }
  function applyChange() {
    if (!change) return;
    try {
      updateUser(
        change.profile.id,
        change.role ? { role: change.role } : { is_active: change.is_active },
      );
      setChange(null);
      toast.success("Đã cập nhật người dùng demo.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể thay đổi người dùng.",
      );
    }
  }
  return (
    <>
      <PageHeading
        kicker="QUẢN TRỊ KHÔNG GIAN"
        title="Người dùng & vai trò"
        description="Phân công quyền truy cập phù hợp cho từng thành viên."
      >
        <Button
          onClick={() => {
            setErrors({});
            setInviting(true);
          }}
        >
          <Plus size={17} /> Thêm người dùng demo
        </Button>
      </PageHeading>
      <div className="notice">
        <ShieldCheck size={20} />
        <span>
          Quản lý người dùng được mô phỏng. Không tạo tài khoản thật hoặc gửi
          thư mời. Vai trò chỉ kiểm soát giao diện và thao tác demo.
        </span>
      </div>
      <div className="mini-stat-grid">
        {roles.map((role) => (
          <div className="panel mini-stat" key={role}>
            <span className="kpi-icon">
              <Users size={19} />
            </span>
            <div>
              <strong>
                {
                  data.users.filter((u) => u.role === role && u.is_active)
                    .length
                }
              </strong>
              <p>{roleLabels[role]} đang hoạt động</p>
            </div>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              Thành viên không gian{" "}
              <span className="count-pill">{data.users.length}</span>
            </h2>
            <p>Dữ liệu hư cấu, chỉ lưu trên trình duyệt này</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Thành viên</th>
                <th scope="col">Email demo</th>
                <th scope="col">Vai trò</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <span className="customer-avatar">
                      {profile.full_name.charAt(0)}
                    </span>
                    {profile.full_name}
                    {profile.id === user?.id && (
                      <span className="count-pill">Bạn</span>
                    )}
                  </td>
                  <td className="muted">{profile.email}</td>
                  <td>
                    <select
                      aria-label={`Vai trò ${profile.email}`}
                      disabled={profile.id === user?.id}
                      value={profile.role}
                      onChange={(e) =>
                        setChange({ profile, role: e.target.value as Role })
                      }
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${profile.is_active ? "status-completed" : "status-cancelled"}`}
                    >
                      <span />
                      {profile.is_active ? "Hoạt động" : "Vô hiệu hóa"}
                    </span>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={profile.id === user?.id}
                      onClick={() =>
                        setChange({ profile, is_active: !profile.is_active })
                      }
                    >
                      {profile.is_active ? "Vô hiệu hóa" : "Kích hoạt"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="table-note">
          Không thể thay đổi vai trò hoặc vô hiệu hóa chính mình. Luôn cần một
          quản trị viên hoạt động.
        </p>
      </section>
      <div className="role-cards">
        {roles.map((role) => (
          <section className="panel role-card" key={role}>
            <ShieldCheck size={22} />
            <h3>{roleLabels[role]}</h3>
            <p>
              {role === "admin"
                ? "Quản lý toàn bộ ứng dụng, người dùng, đồng bộ và cài đặt."
                : role === "editor"
                  ? "Xem tổng quan, báo cáo. Tạo, chỉnh sửa và xóa mềm đơn hàng."
                  : "Xem tổng quan, danh sách đơn hàng và báo cáo. Không chỉnh sửa dữ liệu."}
            </p>
          </section>
        ))}
      </div>
      <Dialog open={inviting} onOpenChange={setInviting}>
        <DialogContent>
          <span className="section-kicker">MÔ PHỎNG LỜI MỜI</span>
          <DialogTitle>Thêm người dùng demo</DialogTitle>
          <DialogDescription>
            Chỉ thêm hồ sơ cục bộ. Hãy dùng tên và email hư cấu (ví dụ:
            example.com).
          </DialogDescription>
          <form onSubmit={invite} noValidate>
            <div className="form-grid">
              <label className="field full-width">
                Họ và tên *
                <input
                  value={form.full_name}
                  maxLength={200}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  aria-invalid={!!errors.full_name}
                />
                {errors.full_name && (
                  <span className="field-error">{errors.full_name}</span>
                )}
              </label>
              <label className="field full-width">
                Email demo *
                <input
                  type="email"
                  value={form.email}
                  placeholder="thanhvien@example.com"
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <span className="field-error">{errors.email}</span>
                )}
              </label>
              <label className="field full-width">
                Vai trò
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as Role })
                  }
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {errors.form && (
              <p className="field-error" role="alert">
                {errors.form}
              </p>
            )}
            <div className="dialog-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviting(false)}
              >
                Hủy
              </Button>
              <Button type="submit">
                <Mail size={16} /> Thêm hồ sơ demo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!change}
        onOpenChange={(open) => {
          if (!open) setChange(null);
        }}
        title="Cập nhật quyền truy cập demo?"
        description={
          change
            ? `${change.profile.full_name}: ${change.role ? `đổi vai trò thành ${roleLabels[change.role]}` : change.is_active ? "kích hoạt người dùng" : "vô hiệu hóa người dùng"}. Thay đổi chỉ áp dụng trên trình duyệt này.`
            : ""
        }
        onConfirm={applyChange}
      />
    </>
  );
}

export function SyncView() {
  const [details, setDetails] = useState(false);
  return (
    <>
      <PageHeading
        kicker="KẾT NỐI & ĐỒNG BỘ"
        title="Trung tâm đồng bộ"
        description="Giao diện dự kiến để đồng bộ dữ liệu vận hành với Google Sheets."
      >
        <span className="outline-pill">Bản xem trước · Phase 1</span>
      </PageHeading>
      <div className="notice notice-warning">
        <AlertCircle size={20} />
        <span>
          Chưa kết nối Google Sheets. Đây là giao diện demo; không có yêu cầu
          API, tác vụ đồng bộ hoặc lịch chạy thực tế.
        </span>
      </div>
      <div className="sync-grid">
        <section className="panel connection-panel">
          <div className="panel-heading">
            <div className="integration-title">
              <span className="integration-icon">
                <FileSpreadsheet size={28} />
              </span>
              <div>
                <h2>Google Sheets</h2>
                <p>Nguồn nhập ban đầu & bản xuất dữ liệu</p>
              </div>
            </div>
            <span className="status-badge status-pending">
              <span />
              Chưa cấu hình
            </span>
          </div>
          <div className="connection-body">
            <div className="connection-placeholder">
              <Link2Off size={26} />
              <h3>Chờ thiết lập kết nối</h3>
              <p>
                Thông tin kết nối sẽ được cấu hình an toàn ở phía máy chủ trong
                giai đoạn tiếp theo.
              </p>
            </div>
            <dl className="detail-list">
              <div>
                <dt>Mã bảng tính</dt>
                <dd>Chưa cấu hình</dd>
              </div>
              <div>
                <dt>Nhập thành công gần nhất</dt>
                <dd>Chưa có</dd>
              </div>
              <div>
                <dt>Xuất thành công gần nhất</dt>
                <dd>Chưa có</dd>
              </div>
              <div>
                <dt>Số dòng đã xuất</dt>
                <dd>0</dd>
              </div>
              <div>
                <dt>Lịch dự kiến (chưa bật)</dt>
                <dd>23:00 · Asia/Ho_Chi_Minh</dd>
              </div>
            </dl>
            <div className="connection-actions">
              <Button disabled variant="outline">
                <FileSpreadsheet size={16} /> Xem trước nhập
              </Button>
              <Button disabled>
                <ArrowDownToLine size={16} /> Xuất lên Sheets
              </Button>
            </div>
            <p className="muted small">
              Các thao tác được mở khi hoàn tất tích hợp thật ở Phase 2.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setDetails(true)}>
              Xem yêu cầu thiết lập <ArrowDownToLine size={13} />
            </Button>
          </div>
        </section>
        <section className="panel workflow-panel">
          <div className="panel-heading">
            <div>
              <h2>Luồng dữ liệu dự kiến</h2>
              <p>PostgreSQL là nguồn dữ liệu chính ở Phase 2</p>
            </div>
          </div>
          <ol className="workflow-steps">
            <li>
              <span>01</span>
              <div>
                <h3>Nhập dữ liệu ban đầu</h3>
                <p>Source_Orders → kiểm tra toàn bộ → database trống.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Vận hành trên SheetOps</h3>
                <p>Tạo và cập nhật đơn hàng, lưu nhật ký thay đổi.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Xuất bản chụp dữ liệu</h3>
                <p>Database → Export_Staging → kiểm tra → Export_Orders.</p>
              </div>
            </li>
          </ol>
          <div className="workflow-note">
            <ShieldCheck size={18} />
            <p>
              Không đọc ngược thay đổi từ bảng xuất. Một lần xuất lỗi không xóa
              bản thành công trước đó.
            </p>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Lịch sử đồng bộ</h2>
            <p>Chỉ hiển thị tác vụ thực tế sau khi tích hợp</p>
          </div>
          <span className="outline-pill">
            <Clock3 size={14} /> Chưa có tác vụ
          </span>
        </div>
        <EmptyState
          title="Chưa có lần đồng bộ nào"
          description="Phase 1 chưa thực hiện nhập hoặc xuất dữ liệu với Google Sheets."
        />
      </section>
      <Dialog open={details} onOpenChange={setDetails}>
        <DialogContent>
          <DialogTitle>Chuẩn bị cho Phase 2</DialogTitle>
          <DialogDescription>
            Thông tin dưới đây là yêu cầu dự kiến. Không nhập khóa bí mật vào
            trình duyệt.
          </DialogDescription>
          <ul className="setup-list">
            <li>Supabase: dự án, đăng nhập thật, migrations và RLS.</li>
            <li>Google Cloud: service account và Sheets API.</li>
            <li>Chia sẻ bảng tính cho email service account.</li>
            <li>Tạo Source_Orders, Export_Staging và Export_Orders.</li>
            <li>Cấu hình biến môi trường phía máy chủ và cron có xác thực.</li>
          </ul>
          <Button className="w-full" onClick={() => setDetails(false)}>
            Đã hiểu
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SettingsView() {
  const { data, user, saveOrganization, reset } = useDemo();
  const [name, setName] = useState(data.organization);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <>
      <PageHeading
        kicker="TÙY CHỈNH KHÔNG GIAN"
        title="Cài đặt"
        description="Thiết lập bản demo và quản lý dữ liệu trên trình duyệt này."
      />
      <div className="settings-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Thông tin không gian</h2>
              <p>Các cài đặt này chỉ phục vụ trình diễn</p>
            </div>
          </div>
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                saveOrganization(name);
                toast.success("Đã lưu tên không gian demo.");
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Không thể lưu.",
                );
              }
            }}
          >
            <label className="field">
              Tên không gian
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </label>
            <label className="field">
              Múi giờ
              <input value="Asia/Ho_Chi_Minh (UTC+7)" readOnly />
            </label>
            <label className="field">
              Đơn vị tiền tệ
              <input value="VND · Số nguyên đồng Việt Nam" readOnly />
            </label>
            <Button type="submit">
              <Check size={16} /> Lưu thay đổi
            </Button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Môi trường demo</h2>
              <p>Chưa sử dụng dịch vụ bên ngoài</p>
            </div>
          </div>
          <dl className="detail-list settings-details">
            <div>
              <dt>Nguồn dữ liệu</dt>
              <dd>300 đơn mẫu ban đầu</dd>
            </div>
            <div>
              <dt>Lưu trữ</dt>
              <dd>Trình duyệt (localStorage)</dd>
            </div>
            <div>
              <dt>Xác thực</dt>
              <dd>Mô phỏng vai trò</dd>
            </div>
            <div>
              <dt>Google Sheets</dt>
              <dd>Chưa cấu hình</dd>
            </div>
            <div>
              <dt>Lịch xuất tự động</dt>
              <dd>Chưa kích hoạt</dd>
            </div>
          </dl>
          <div className="reset-area">
            <h3>Khôi phục dữ liệu mẫu</h3>
            <p>
              Xóa thay đổi trên trình duyệt, khôi phục 300 đơn hàng ban đầu và
              đăng xuất phiên demo.
            </p>
            <Button variant="outline" onClick={() => setConfirmReset(true)}>
              <RefreshCw size={15} /> Đặt lại bản demo
            </Button>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Nhật ký thao tác cục bộ</h2>
            <p>Tối đa 100 sự kiện demo · Chưa phải nhật ký kiểm toán máy chủ</p>
          </div>
          <span className="count-pill">{data.audit.length} sự kiện</span>
        </div>
        {data.audit.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Thời gian (UTC+7)</th>
                  <th scope="col">Người thực hiện</th>
                  <th scope="col">Thao tác</th>
                  <th scope="col">Mã đối tượng</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.map((event) => (
                  <tr key={event.id}>
                    <td className="muted">{formatTime(event.created_at)}</td>
                    <td>
                      {data.users.find((u) => u.id === event.actor_id)
                        ?.full_name ?? user?.full_name}
                    </td>
                    <td>{event.action}</td>
                    <td className="resource-id">
                      {data.orders.find((o) => o.id === event.resource_id)
                        ?.order_code ?? event.resource_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Chưa có thao tác nào"
            description="Tạo hoặc chỉnh sửa dữ liệu để xem nhật ký demo ở đây."
          />
        )}
      </section>
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Đặt lại toàn bộ bản demo?"
        description="Mọi thay đổi đơn hàng, người dùng, cài đặt và nhật ký cục bộ sẽ bị xóa. Khôi phục đúng 300 đơn hàng mẫu và quay về đăng nhập."
        onConfirm={() => {
          try {
            reset();
            setConfirmReset(false);
            toast.success("Đã khôi phục dữ liệu mẫu.");
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Không thể đặt lại.",
            );
          }
        }}
        destructive
        confirmLabel="Đặt lại & đăng xuất"
      />
    </>
  );
}
