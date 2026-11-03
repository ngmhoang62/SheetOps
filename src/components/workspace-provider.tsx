"use client";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Profile } from "@/lib/contracts";
import { api, ApiError } from "./resource";
type Workspace = {
  user: Profile | null;
  organization: string;
  ready: boolean;
  error: string;
  sessionIssue: string | null;
  revision: number;
  refresh: () => Promise<void>;
  changed: () => void;
  logout: () => Promise<void>;
};
const Context = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState("SheetOps");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [sessionIssue, setSessionIssue] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(async () => {
    try {
      const data = await api<{ profile: Profile; organization: string }>(
        "/api/session",
      );
      setUser(data.profile);
      setOrganization(data.organization);
      setError("");
      setSessionIssue(null);
    } catch (e) {
      setUser(null);
      setSessionIssue(
        e instanceof ApiError && e.status === 403
          ? e.code === "ACCOUNT_DISABLED"
            ? "account_disabled"
            : "account_unavailable"
          : e instanceof ApiError && e.status === 401
            ? "session_expired"
            : null,
      );
      setError(e instanceof Error ? e.message : "Không thể xác thực phiên.");
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize the external authenticated session
    void refresh();
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    const timer = setInterval(focus, 60000);
    return () => {
      window.removeEventListener("focus", focus);
      clearInterval(timer);
    };
  }, [refresh]);
  return (
    <Context.Provider
      value={{
        user,
        organization,
        ready,
        error,
        sessionIssue,
        revision,
        refresh,
        changed: () => setRevision((v) => v + 1),
        logout: async () => {
          await api("/api/auth/logout", { method: "POST" });
          setUser(null);
          router.replace("/login");
          router.refresh();
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("WorkspaceProvider required");
  return value;
}
