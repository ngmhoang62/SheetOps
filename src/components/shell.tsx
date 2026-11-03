"use client";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
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
import { canAccess, roleLabels } from "@/lib/domain";
import { useWorkspace } from "./workspace-provider";
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
  const { organization, user, ready, logout, error, sessionIssue, refresh } =
    useWorkspace();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (
      ready &&
      !user &&
      (sessionIssue || !error) &&
      path !== "/login" &&
      !path.startsWith("/auth/")
    )
      router.replace(sessionIssue ? `/login?reason=${sessionIssue}` : "/login");
  }, [ready, user, path, router, sessionIssue, error]);
  if (path === "/login" || path.startsWith("/auth/")) return <>{children}</>;
  if (ready && !user && error && !sessionIssue)
    return (
      <div className="loading-state" role="alert">
        <p>{error}</p>
        <Button onClick={() => void refresh()}>Thử lại</Button>
      </div>
    );
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
            <strong>{organization}</strong>
            <small>Tổ chức nội bộ</small>
          </span>
        </div>
        <p className="nav-heading">KHÔNG GIAN LÀM VIỆC</p>
        <nav aria-label="Điều hướng chính">
          {navigation
            .filter((item) => canAccess(user.role, item.href))
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => setOpen(false)}
                className={`nav-link ${path === item.href ? "active" : ""}`}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
                {path === item.href && <span className="active-dot" />}
              </Link>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-footer">
            <CircleHelp size={16} />
            <span>SheetOps · Nội bộ</span>
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
              <span className="live-dot" /> PostgreSQL
            </span>
            <details className="user-menu">
              <summary aria-label={`Tài khoản: ${roleLabels[user.role]}`}>
                <span className="avatar">{user.full_name.slice(0, 1)}</span>
                <span className="user-label">
                  {user.full_name}
                  <small>{roleLabels[user.role]}</small>
                </span>
                <ChevronDown size={15} />
              </summary>
              <div className="user-dropdown">
                <button
                  onClick={async () => {
                    try {
                      await logout();
                    } catch {
                      toast.error("Không thể đăng xuất. Vui lòng thử lại.");
                    }
                  }}
                >
                  <LogOut size={15} /> Đăng xuất
                </button>
              </div>
            </details>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {error && (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          )}
          {permitted ? (
            children
          ) : (
            <div className="forbidden panel">
              <ShieldCheck size={42} />
              <h1>Bạn không có quyền truy cập</h1>
              <p>
                Trang này chỉ dành cho quản trị viên. Quyền truy cập được kiểm
                tra phía máy chủ.
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
            <span className="live-dot" /> Kết nối dữ liệu tập trung
          </span>
        </footer>
      </div>
    </div>
  );
}

export { LoginPage } from "./login-view";
