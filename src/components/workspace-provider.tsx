"use client";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { Profile } from "@/lib/contracts";
import { QueryClientProvider } from "@tanstack/react-query";
import { createSessionQueryClient, affectedResource } from "@/lib/query-policy";
import { api, ApiError } from "./resource";
export type WorkspaceSession = {
  profile: Profile;
  organization: string;
  dashboard?: unknown;
};
const defaultSummaryKey = "/api/dashboard/summary?from=&to=&status=all&search=";
type Workspace = {
  establish: (session: WorkspaceSession) => void;
  user: Profile | null;
  organization: string;
  ready: boolean;
  error: string;
  sessionIssue: string | null;
  revision: number;
  refresh: () => Promise<void>;
  changed: (domain?: string) => Promise<void>;
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
  const [epoch, setEpoch] = useState(0);
  const [bootstrap, setBootstrap] = useState<{
    id: string;
    role: string;
    data: unknown;
    at: number;
  } | null>(null);
  const client = useMemo(() => {
    const owned = createSessionQueryClient(
      [process.env.NEXT_PUBLIC_SUPABASE_URL, user?.id, user?.role, epoch].join(
        ":",
      ),
    );
    if (bootstrap && bootstrap.id === user?.id && bootstrap.role === user?.role)
      owned.setQueryData([defaultSummaryKey], bootstrap.data, {
        updatedAt: bootstrap.at,
      });
    return owned;
  }, [user?.id, user?.role, epoch, bootstrap]);
  const generation = useRef(0);
  const loggingOut = useRef(false);
  const [tabId] = useState(() => crypto.randomUUID());
  const refreshing = useRef<Promise<void> | null>(null);
  const establish = useCallback(
    (data: WorkspaceSession) => {
      generation.current++;
      const channel =
        typeof BroadcastChannel !== "undefined"
          ? new BroadcastChannel("sheetops-session")
          : null;
      channel?.postMessage({ type: "reset", sender: tabId });
      channel?.close();
      setEpoch((v) => v + 1);
      setBootstrap(
        data.dashboard === undefined
          ? null
          : {
              id: data.profile.id,
              role: data.profile.role,
              data: data.dashboard,
              at: Date.now(),
            },
      );
      setUser(data.profile);
      setOrganization(data.organization);
      setError("");
      setSessionIssue(null);
      setReady(true);
    },
    [tabId],
  );
  const refresh = useCallback(() => {
    if (refreshing.current) return refreshing.current;
    const version = generation.current;
    const task: Promise<void> = (async () => {
      try {
        const data = await api<{ profile: Profile; organization: string }>(
          "/api/session",
        );
        if (version !== generation.current) return;
        setBootstrap((previous) =>
          previous?.id === data.profile.id &&
          previous.role === data.profile.role
            ? previous
            : null,
        );
        setUser(data.profile);
        setOrganization(data.organization);
        setError("");
        setSessionIssue(null);
      } catch (e) {
        if (version !== generation.current) return;
        // A temporary service failure must not erase a still-authenticated workspace.
        if (!(e instanceof ApiError) || ![401, 403].includes(e.status)) {
          setError(
            e instanceof Error ? e.message : "Không thể xác thực phiên.",
          );
          return;
        }
        setUser(null);
        setBootstrap(null);
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
        if (version === generation.current) setReady(true);
      }
    })().finally(() => {
      if (refreshing.current === task) refreshing.current = null;
    });
    refreshing.current = task;
    return task;
  }, []);
  useEffect(() => {
    void refresh();
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    const timer = setInterval(focus, 30000);
    return () => {
      window.removeEventListener("focus", focus);
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    const onAccess = (event: Event) => {
      if (loggingOut.current) return;
      const { status, code } = (event as CustomEvent).detail;
      if (
        status === 401 ||
        ["ACCOUNT_DISABLED", "ACCOUNT_UNAVAILABLE"].includes(code)
      ) {
        generation.current++;
        refreshing.current = null;
        void client.cancelQueries();
        client.clear();
        setBootstrap(null);
        setUser(null);
        setSessionIssue(
          status === 401 ? "session_expired" : "account_unavailable",
        );
      } else {
        void refresh();
      }
    };
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("sheetops-session")
        : null;
    if (channel)
      channel.onmessage = (event) => {
        if (event.data?.sender === tabId) return;
        generation.current++;
        refreshing.current = null;
        void client.cancelQueries();
        client.clear();
        setBootstrap(null);
        setUser(null);
        setReady(false);
        void refresh();
      };
    window.addEventListener("workspace-access", onAccess);
    return () => {
      channel?.close();
      window.removeEventListener("workspace-access", onAccess);
      void client.cancelQueries();
      client.clear();
    };
  }, [client, refresh, tabId]);
  return (
    <QueryClientProvider client={client}>
      <Context.Provider
        value={{
          establish,
          user,
          organization,
          ready,
          error,
          sessionIssue,
          revision,
          refresh,
          changed: (domain = "all") => {
            setRevision((v) => v + 1);
            return client.invalidateQueries({
              predicate: (q) => affectedResource(String(q.queryKey[0]), domain),
            });
          },
          logout: async () => {
            loggingOut.current = true;
            try {
              generation.current++;
              await client.cancelQueries();
              client.clear();
              setBootstrap(null);
              await api("/api/auth/logout", { method: "POST" });
              const channel =
                typeof BroadcastChannel !== "undefined"
                  ? new BroadcastChannel("sheetops-session")
                  : null;
              channel?.postMessage({ type: "reset", sender: tabId });
              channel?.close();
              setUser(null);
              setSessionIssue(null);
              setError("");
              router.replace("/login");
              router.refresh();
            } finally {
              loggingOut.current = false;
            }
          },
        }}
      >
        {children}
      </Context.Provider>
    </QueryClientProvider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("WorkspaceProvider required");
  return value;
}
