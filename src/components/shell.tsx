"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Settings2,
  Sheet,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { canAccess, roleLabels, roles, type Role } from "@/lib/domain";
import { useDemo } from "./demo-provider";
import { Button } from "./ui/button";

const navigation = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/orders", label: "Đơn hàng", icon: ClipboardList },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 },
  { href: "/users", label: "Người dùng", icon: Users, admin: true },
  { href: "/sync", label: "Đồng bộ dữ liệu", icon: RefreshCw, admin: true },
  { href: "/settings", label: "Cài đặt", icon: Settings2, admin: true },
];
export function LoadingState() {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      Đang chuẩn bị không gian làm việc…
    </div>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const { data, user, ready, login, logout, storageError } = useDemo();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (ready && !user && path !== "/login") router.replace("/login");
  }, [ready, user, path, router]);
  if (path === "/login") return <>{children}</>;
  if (!ready || !user) return <LoadingState />;
  const page = navigation.find((item) => item.href === path);
  const permitted = canAccess(user.role, path);
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Chuyển đến nội dung
      </a>
      {open && (
        <button
          className="mobile-overlay"
          aria-label="Đóng điều hướng"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Link
          href="/dashboard"
          className="brand"
          onClick={() => setOpen(false)}
        >
          <span className="brand-symbol">
            <Sheet size={23} />
          </span>
          <span>
            Sheet<span className="brand-light">Ops</span>
            <small>KHÔNG GIAN VẬN HÀNH</small>
          </span>
        </Link>
        <div className="workspace-chip">
          <span className="workspace-avatar">S</span>
          <span>
            <strong>{data.organization}</strong>
            <small>Không gian demo</small>
          </span>
          <ChevronDown size={14} />
        </div>
        <p className="nav-heading">KHÔNG GIAN LÀM VIỆC</p>
        <nav aria-label="Điều hướng chính">
          {navigation
            .filter((item) => canAccess(user.role, item.href))
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`nav-link ${path === item.href ? "active" : ""}`}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
                {item.href === "/orders" && (
                  <small>
                    {data.orders.filter((o) => !o.deleted_at).length}
                  </small>
                )}
                {path === item.href && <span className="active-dot" />}
              </Link>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-note">
            <span className="eyebrow">
              <span className="live-dot" /> GIAI ĐOẠN 01 · BẢN MẪU
            </span>
            <strong>Sẵn sàng để khám phá</strong>
            <p>
              Trải nghiệm với dữ liệu mẫu. Mọi thay đổi chỉ lưu trên trình duyệt
              này.
            </p>
            <Link href="/reports">
              Khám phá báo cáo <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="sidebar-footer">
            <CircleHelp size={16} />
            <span>SheetOps · Bản thử nghiệm</span>
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="breadcrumb">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="Mở điều hướng"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <span>Không gian làm việc</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{page?.label ?? "SheetOps"}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-pill">
              <span className="live-dot" /> Dữ liệu demo
            </span>
            <details className="user-menu">
              <summary aria-label={`Tài khoản demo: ${roleLabels[user.role]}`}>
                <span className="avatar">{user.full_name.slice(0, 1)}</span>
                <span className="user-label">
                  {user.full_name.replace(" (giả lập)", "")}
                  <small>{roleLabels[user.role]}</small>
                </span>
                <ChevronDown size={15} />
              </summary>
              <div className="user-dropdown">
                <p>CHUYỂN VAI TRÒ DEMO</p>
                {roles.map((role) => (
                  <button
                    key={role}
                    disabled={
                      !data.users.some((u) => u.role === role && u.is_active)
                    }
                    onClick={(e) => {
                      if (login(role)) {
                        e.currentTarget
                          .closest("details")
                          ?.removeAttribute("open");
                      }
                    }}
                  >
                    {roleLabels[role]}
                    {user.role === role && <Check size={15} />}
                  </button>
                ))}
                <hr />
                <button
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                >
                  <LogOut size={15} /> Đăng xuất demo
                </button>
              </div>
            </details>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {storageError && (
            <div className="notice notice-error" role="alert">
              {storageError}
            </div>
          )}
          {permitted ? (
            children
          ) : (
            <div className="forbidden panel">
              <ShieldCheck size={42} />
              <h1>Bạn không có quyền truy cập</h1>
              <p>
                Trang này chỉ dành cho quản trị viên. Phân quyền hiện được mô
                phỏng trên trình duyệt.
              </p>
              <Button asChild>
                <Link href="/dashboard">Về tổng quan</Link>
              </Button>
            </div>
          )}
        </main>
        <footer className="app-footer">
          <span>© 2026 SheetOps. Không gian vận hành của bạn.</span>
          <span>
            <span className="live-dot" /> Bản demo · Không kết nối dịch vụ thật
          </span>
        </footer>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login, ready, user, storageError } = useDemo();
  const [role, setRole] = useState<Role>("admin");
  const router = useRouter();
  if (!ready) return <LoadingState />;
  return (
    <div className="login-page">
      <div className="login-story">
        <div className="brand">
          <span className="brand-symbol">
            <Sheet size={26} />
          </span>
          <span>SheetOps</span>
        </div>
        <div>
          <span className="eyebrow">MỌI HOẠT ĐỘNG. MỘT GÓC NHÌN.</span>
          <h1>
            Vận hành rõ ràng.
            <br />
            Quyết định tự tin.
          </h1>
          <p>
            Quản lý đơn hàng, theo dõi doanh thu và kết nối dữ liệu trong một
            không gian làm việc.
          </p>
          <div className="login-stats">
            <span>
              <strong>300</strong>đơn hàng mẫu
            </span>
            <span>
              <strong>12</strong>tháng dữ liệu
            </span>
            <span>
              <strong>3</strong>vai trò trải nghiệm
            </span>
          </div>
        </div>
        <small>Giai đoạn 1 · Bản mẫu tương tác · 2026</small>
      </div>
      <section className="login-form">
        <span className="section-kicker">CHÀO MỪNG ĐẾN SHEETOPS</span>
        <h2>Khám phá không gian demo</h2>
        <p>Chọn một vai trò để trải nghiệm ứng dụng.</p>
        <div className="notice">
          <ShieldCheck size={20} />
          <span>
            Đăng nhập và phân quyền được mô phỏng. Không cần mật khẩu; đây chưa
            phải hệ thống bảo mật thật.
          </span>
        </div>
        {storageError && (
          <div role="alert" className="notice notice-error">
            {storageError}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (login(role)) router.push("/dashboard");
          }}
        >
          <label className="field">
            Vai trò trải nghiệm
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
          </label>
          <div className="role-description">
            {role === "admin"
              ? "Toàn quyền khám phá đơn hàng, báo cáo và quản trị demo."
              : role === "editor"
                ? "Xem báo cáo và tạo, sửa, xóa mềm đơn hàng mẫu."
                : "Chỉ xem tổng quan, đơn hàng và báo cáo."}
          </div>
          <Button type="submit" className="w-full">
            Vào không gian làm việc <ArrowUpRight size={17} />
          </Button>
        </form>
        {user && (
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            Tiếp tục với {roleLabels[user.role]}
          </Button>
        )}
        <small className="muted">
          Dữ liệu hư cấu · Lưu cục bộ trên trình duyệt
        </small>
      </section>
    </div>
  );
}
