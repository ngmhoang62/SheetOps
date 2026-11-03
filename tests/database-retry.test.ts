import { afterEach, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
afterEach(() => vi.useRealTimers());
function client(fetcher: typeof fetch) {
  return createClient("https://fixture.example.invalid", "test-only", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetcher },
  });
}
it("installed SDK retries GET 503 at 1/2/4 seconds, at most four attempts", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () => new Response('{"message":"transient"}', { status: 503 }),
    );
  const pending = Promise.resolve(client(fetcher).from("orders").select("id"));
  await vi.advanceTimersByTimeAsync(7500);
  const result = await pending;
  expect(fetcher).toHaveBeenCalledTimes(4);
  expect(result.status).toBe(503);
});
it.each([401, 403])(
  "does not retry GET authorization failure %s",
  async (status) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{"message":"denied"}', { status }));
    await client(fetcher).from("orders").select("id");
    expect(fetcher).toHaveBeenCalledOnce();
  },
);
it("does not replay a write or POST RPC after 503", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () => new Response('{"message":"unavailable"}', { status: 503 }),
    );
  const db = client(fetcher);
  await db.from("orders").insert({ order_code: "TEST" });
  expect(fetcher).toHaveBeenCalledOnce();
  fetcher.mockClear();
  await db.rpc("audit_page", {});
  expect(fetcher).toHaveBeenCalledOnce();
});
