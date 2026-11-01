"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  changeUser,
  snapshotSchema,
  softDelete,
  upsertOrder,
  userSchema,
  type DemoUser,
  type OrderInput,
  type Role,
  type Snapshot,
} from "@/lib/domain";
import { initialSnapshot } from "@/lib/seed";

const STORAGE_KEY = "sheetops-demo-v1";
const SESSION_KEY = "sheetops-session-v1";
type DemoContextValue = {
  data: Snapshot;
  user: DemoUser | null;
  ready: boolean;
  storageError: string;
  login: (role: Role) => boolean;
  logout: () => void;
  saveOrder: (input: OrderInput, id?: string) => void;
  deleteOrder: (id: string) => void;
  updateUser: (
    id: string,
    change: Partial<Pick<DemoUser, "role" | "is_active">>,
  ) => void;
  inviteUser: (full_name: string, email: string, role: Role) => void;
  saveOrganization: (name: string) => void;
  reset: () => void;
};
const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Snapshot>(initialSnapshot);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [corrupt, setCorrupt] = useState(false);
  useEffect(() => {
    // Hydrate an external browser store only after SSR. Never overwrite corrupt data silently.
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = snapshotSchema.safeParse(JSON.parse(stored));
        if (!parsed.success) throw new Error("invalid snapshot");
        // eslint-disable-next-line react-hooks/set-state-in-effect -- external browser storage hydration
        setData(parsed.data);
      }
      setSessionId(localStorage.getItem(SESSION_KEY));
    } catch {
      setCorrupt(true);
      setStorageError(
        "Không đọc được dữ liệu đã lưu. Đang dùng dữ liệu mẫu trong bộ nhớ. Đặt lại bản demo để khôi phục lưu trữ.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || corrupt) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- surface an external storage write failure
      setStorageError(
        "Trình duyệt không cho phép lưu dữ liệu. Thay đổi hiện chỉ được giữ trong phiên này.",
      );
    }
  }, [data, ready, corrupt]);
  const user =
    data.users.find((u) => u.id === sessionId && u.is_active) ?? null;
  function requireUser() {
    if (!user) throw new Error("Vui lòng đăng nhập bản demo.");
    return user;
  }
  function audit(
    next: Snapshot,
    action: string,
    resource_id: string,
    actor: DemoUser,
  ) {
    return {
      ...next,
      audit: [
        {
          id: crypto.randomUUID(),
          actor_id: actor.id,
          action,
          resource_id,
          created_at: new Date().toISOString(),
        },
        ...next.audit,
      ].slice(0, 100),
    };
  }
  function setSession(id: string | null) {
    setSessionId(id);
    try {
      if (id) localStorage.setItem(SESSION_KEY, id);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      setStorageError(
        "Không thể lưu phiên demo; bạn có thể cần chọn lại vai trò sau khi tải lại.",
      );
    }
  }
  const value: DemoContextValue = {
    data,
    user,
    ready,
    storageError,
    login(role) {
      const profile = data.users.find((u) => u.role === role && u.is_active);
      if (!profile) {
        toast.error("Không có người dùng đang hoạt động cho vai trò này.");
        return false;
      }
      setSession(profile.id);
      return true;
    },
    logout() {
      setSession(null);
    },
    saveOrder(input, id) {
      const actor = requireUser();
      const orders = upsertOrder(data.orders, input, actor.role, actor.id, id);
      setData(
        audit(
          { ...data, orders },
          id ? "Cập nhật đơn hàng" : "Tạo đơn hàng",
          id ?? orders[0].id,
          actor,
        ),
      );
    },
    deleteOrder(id) {
      const actor = requireUser();
      setData(
        audit(
          {
            ...data,
            orders: softDelete(data.orders, id, actor.role, actor.id),
          },
          "Xóa mềm đơn hàng",
          id,
          actor,
        ),
      );
    },
    updateUser(id, change) {
      const actor = requireUser();
      setData(
        audit(
          {
            ...data,
            users: changeUser(data.users, id, change, actor.id, actor.role),
          },
          change.role ? "Đổi vai trò" : "Đổi trạng thái người dùng",
          id,
          actor,
        ),
      );
    },
    inviteUser(full_name, email, role) {
      const actor = requireUser();
      if (actor.role !== "admin")
        throw new Error("Bạn không có quyền quản lý người dùng.");
      if (data.users.length >= 100)
        throw new Error("Giới hạn 100 người dùng demo.");
      const profile = userSchema.parse({
        id: crypto.randomUUID(),
        full_name,
        email: email.trim().toLowerCase(),
        role,
        is_active: true,
      });
      if (data.users.some((u) => u.email.toLowerCase() === profile.email))
        throw new Error("Email đã tồn tại.");
      setData(
        audit(
          { ...data, users: [...data.users, profile] },
          "Tạo người dùng demo (không gửi email)",
          profile.id,
          actor,
        ),
      );
    },
    saveOrganization(name) {
      const actor = requireUser();
      if (actor.role !== "admin") throw new Error("Không có quyền.");
      const organization = name.trim();
      if (!organization || organization.length > 100)
        throw new Error("Tên không gian cần từ 1 đến 100 ký tự.");
      setData(
        audit(
          { ...data, organization },
          "Đổi tên không gian demo",
          "settings",
          actor,
        ),
      );
    },
    reset() {
      const actor = requireUser();
      if (actor.role !== "admin") throw new Error("Không có quyền.");
      setData(initialSnapshot());
      setSessionId(null);
      setCorrupt(false);
      setStorageError("");
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SESSION_KEY);
      } catch {
        setStorageError(
          "Đã đặt lại trong bộ nhớ; trình duyệt vẫn chặn lưu trữ.",
        );
      }
    },
  };
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("DemoProvider is required");
  return context;
}
