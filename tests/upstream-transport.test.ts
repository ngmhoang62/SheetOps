import { afterEach, expect, it, vi } from "vitest";
import { upstreamFetch } from "../src/lib/supabase/transport";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("bounds upstream waits while preserving caller cancellation", async () => {
  const deadline = new AbortController();
  const timeout = vi
    .spyOn(AbortSignal, "timeout")
    .mockReturnValue(deadline.signal);
  const caller = new AbortController();
  const fetcher = vi.fn(async (_input: unknown, init?: RequestInit) => {
    expect(init?.signal?.aborted).toBe(false);
    caller.abort();
    expect(init?.signal?.aborted).toBe(true);
    return new Response("ok");
  });
  vi.stubGlobal("fetch", fetcher);
  await upstreamFetch("https://example.test/rest/v1/orders", {
    signal: caller.signal,
  });
  expect(timeout).toHaveBeenCalledWith(12000);
});

it("forwards an upstream deadline abort and reports no sensitive URL fields", async () => {
  const deadline = new AbortController();
  vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
  vi.stubEnv("PERF_DIAGNOSTICS", "1");
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  vi.stubGlobal("fetch", async (_input: unknown, init?: RequestInit) => {
    deadline.abort();
    expect(init?.signal?.aborted).toBe(true);
    throw new Error("transport failed");
  });
  await expect(
    upstreamFetch("https://example.test/auth/v1/user?token=private-value"),
  ).rejects.toThrow("transport failed");
  expect(log).toHaveBeenCalledOnce();
  expect(String(log.mock.calls[0])).not.toContain("private-value");
  expect(String(log.mock.calls[0])).not.toContain("/auth/v1/user");
});
