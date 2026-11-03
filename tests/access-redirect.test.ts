import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { proxy } from "../src/proxy";
import { loginNotice } from "../src/lib/access-notice";

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

describe("revoked account navigation", () => {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const single = vi.fn();
  const getUser = vi.fn();
  beforeEach(() => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://ubaxgkqkfcrqbyshkidz.supabase.co",
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-only");
    signOut.mockClear();
    getUser.mockResolvedValue({ data: { user: { id: "test-viewer" } } });
    single.mockResolvedValue({ data: { role: "viewer", is_active: false } });
    const db = {
      auth: { getUser, signOut },
      from: () => ({ select: () => ({ eq: () => ({ single }) }) }),
    };
    vi.mocked(createServerClient).mockReturnValue(
      db as unknown as ReturnType<typeof createServerClient>,
    );
  });
  it("redirects a disabled user and expires all project session cookie chunks", async () => {
    const result = await proxy(
      new NextRequest("https://sheetops.vercel.app/orders", {
        headers: {
          cookie:
            "sb-ubaxgkqkfcrqbyshkidz-auth-token.0=test; sb-ubaxgkqkfcrqbyshkidz-auth-token.1=test; preference=keep",
        },
      }),
    );
    expect(result.status).toBe(307);
    expect(result.headers.get("location")).toBe(
      "https://sheetops.vercel.app/login?reason=account_disabled",
    );
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(
      result.cookies.get("sb-ubaxgkqkfcrqbyshkidz-auth-token.0")?.maxAge,
    ).toBe(0);
    expect(
      result.cookies.get("sb-ubaxgkqkfcrqbyshkidz-auth-token.1")?.maxAge,
    ).toBe(0);
    expect(result.cookies.has("preference")).toBe(false);
  });
  it("rejects missing profiles and safely clears cookies even if logout fails", async () => {
    single.mockResolvedValue({ data: null });
    signOut.mockRejectedValueOnce(new Error("unavailable"));
    const result = await proxy(
      new NextRequest("https://sheetops.vercel.app/dashboard"),
    );
    expect(result.headers.get("location")).toContain(
      "reason=account_unavailable",
    );
  });
  it("handles client-detected revocation without looping on the login page", async () => {
    const url = "https://sheetops.vercel.app/login?reason=account_disabled";
    expect((await proxy(new NextRequest(url))).status).toBe(307);
    getUser.mockResolvedValue({ data: { user: null } });
    const result = await proxy(new NextRequest(url));
    expect(result.status).toBe(200);
    expect(result.headers.get("location")).toBeNull();
  });
  it("keeps API responses owned by their authentication handlers", async () => {
    const result = await proxy(
      new NextRequest("https://sheetops.vercel.app/api/orders"),
    );
    expect(result.status).toBe(200);
    expect(single).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
  it("keeps active Viewers signed in when an admin page returns 403", async () => {
    single.mockResolvedValue({ data: { role: "viewer", is_active: true } });
    expect(
      (await proxy(new NextRequest("https://sheetops.vercel.app/users")))
        .status,
    ).toBe(403);
    expect(signOut).not.toHaveBeenCalled();
    expect(
      (await proxy(new NextRequest("https://sheetops.vercel.app/orders")))
        .status,
    ).toBe(200);
  });
  it("shows only known static login messages", () => {
    expect(loginNotice("account_disabled")).toContain("vô hiệu hóa");
    expect(loginNotice("account_unavailable")).toContain("chưa được cấp quyền");
    expect(loginNotice("session_expired")).toContain("hết hạn");
    expect(loginNotice("<script>untrusted</script>")).toBe("");
  });
});
