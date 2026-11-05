import { beforeEach, expect, it, vi } from "vitest";
import type { BrowserContext, Route } from "@playwright/test";
import {
  benchmarkPlan,
  PreviewTraffic,
  previewOrigin,
} from "../scripts/preview-traffic";

beforeEach(() => {
  vi.stubEnv("PREVIEW_ORIGIN", "https://preview.example.test");
  vi.stubEnv("PRODUCTION_APP_ORIGIN", "https://production.example.test");
});

it("keeps Preview benchmark small and refuses large loops before fixture creation", () => {
  expect(benchmarkPlan(previewOrigin(), {})).toEqual({
    cycles: 1,
    logins: 1,
    apiSamples: 0,
    count: 300,
  });
  for (const env of [
    { PERF_CYCLES: "20" },
    { PERF_LOGIN_SAMPLES: "20" },
    { PERF_API_SAMPLES: "1" },
    { PERF_ORDER_COUNT: "2000" },
    { PERF_RESPONSIVE: "1" },
  ])
    expect(() => benchmarkPlan(previewOrigin(), env)).toThrow();
  expect(
    benchmarkPlan("http://127.0.0.1:3001", {
      PERF_ORDER_COUNT: "2000",
      PERF_API_SAMPLES: "20",
    }),
  ).toMatchObject({ cycles: 20, count: 2000, apiSamples: 20 });
});
it("serializes complete responses and spaces application request starts", async () => {
  let now = 0;
  const gate = new PreviewTraffic({
    now: () => now,
    wait: async (ms) => {
      now += ms;
    },
  });
  const started: number[] = [];
  let finish!: () => void;
  const first = gate.run(true, async () => {
    started.push(now);
    await new Promise<void>((r) => {
      finish = r;
    });
  });
  const second = gate.run(true, async () => {
    started.push(now);
  });
  await Promise.resolve();
  expect(started).toEqual([0]);
  finish();
  await Promise.all([first, second]);
  expect(started).toEqual([0, 2000]);
  expect(gate.stats.peakConcurrency).toBe(1);
});
it("stops queued requests immediately after a challenge without retry", async () => {
  const gate = new PreviewTraffic({ now: () => 0, wait: async () => {} });
  const first = gate.run(true, async () =>
    gate.stop("VERCEL_SECURITY_CHECKPOINT"),
  );
  const next = gate.run(true, async () => {
    throw Error("must not dispatch");
  });
  await first;
  await expect(next).rejects.toThrow("VERCEL_SECURITY_CHECKPOINT");
  expect(gate.stats.requests).toBe(1);
});
it("enforces a hard request budget", async () => {
  const gate = new PreviewTraffic(
    { now: () => 0, wait: async () => {} },
    { total: 1, application: 1, appGap: 0, assetGap: 0 },
  );
  await gate.run(true, async () => {});
  await expect(gate.run(false, async () => {})).rejects.toThrow(
    "PREVIEW_TRAFFIC_BUDGET",
  );
  expect(gate.stats.requests).toBe(1);
});

it("skips unrelated speculative prefetch without contacting Preview, but allows the intended route", async () => {
  const gate = new PreviewTraffic({ now: () => 0, wait: async () => {} });
  let handler!: (route: Route) => Promise<void>;
  const context = {
    route: async (_pattern: string, callback: typeof handler) => {
      handler = callback;
    },
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
  gate.focusRoute("/orders");
  await gate.attach(context as unknown as BrowserContext);
  const abort = vi.fn().mockResolvedValue(undefined),
    send = vi.fn().mockResolvedValue(undefined);
  const route = (path: string) =>
    ({
      abort,
      continue: send,
      request: () => ({
        url: () => previewOrigin() + path,
        headers: () => ({ "next-router-prefetch": "1" }),
        response: async () => ({
          headers: () => ({}),
          status: () => 200,
          finished: async () => {},
        }),
      }),
    }) as unknown as Route;
  await handler(route("/users"));
  expect(abort).toHaveBeenCalledOnce();
  expect(send).not.toHaveBeenCalled();
  expect(gate.stats.requests).toBe(0);
  await handler(route("/orders"));
  expect(send).toHaveBeenCalledOnce();
  expect(gate.stats.skippedPrefetch).toBe(1);
  expect(gate.stats.requests).toBe(1);
});
it("closes an attached browser context immediately on a challenge", async () => {
  const gate = new PreviewTraffic();
  const close = vi.fn().mockResolvedValue(undefined);
  await gate.attach({
    route: async () => {},
    on: vi.fn(),
    close,
  } as unknown as BrowserContext);
  gate.stop("VERCEL_SECURITY_CHECKPOINT");
  gate.stop("PREVIEW_TRAFFIC_BUDGET");
  expect(close).toHaveBeenCalledOnce();
  expect(gate.blocked).toBe("VERCEL_SECURITY_CHECKPOINT");
});

it("lets an application stream finish when it depends on a static module, with at most two requests", async () => {
  const gate = new PreviewTraffic({ now: () => 0, wait: async () => {} });
  const loaded: string[] = [];
  await gate.run(true, async () => {
    await gate.run(false, async () => {
      loaded.push("module");
    });
    loaded.push("route");
  });
  expect(loaded).toEqual(["module", "route"]);
  expect(gate.stats.peakConcurrency).toBe(2);
  expect(gate.stats.peakApplicationConcurrency).toBe(1);
  expect(gate.stats.peakAssetConcurrency).toBe(1);
});

it("releases a streamed route at headers so its dependent API can complete", async () => {
  const gate = new PreviewTraffic({ now: () => 0, wait: async () => {} });
  let handler!: (route: Route) => Promise<void>;
  await gate.attach({
    route: async (_pattern: string, callback: typeof handler) => {
      handler = callback;
    },
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as BrowserContext);
  const streamEnd = vi.fn(() => new Promise<void>(() => {})),
    apiEnd = vi.fn().mockResolvedValue(undefined);
  const route = (path: string, finished: () => Promise<void>) =>
    ({
      continue: async () => {},
      abort: async () => {},
      request: () => ({
        url: () => previewOrigin() + path,
        headers: () => ({}),
        response: async () => ({
          headers: () => ({}),
          status: () => 200,
          finished,
        }),
      }),
    }) as unknown as Route;
  await handler(route("/sync", streamEnd));
  await handler(route("/api/sync/runs", apiEnd));
  expect(streamEnd).not.toHaveBeenCalled();
  expect(apiEnd).toHaveBeenCalledOnce();
  expect(gate.stats.headerOnlyRoutes).toBe(1);
  expect(gate.stats.peakApplicationConcurrency).toBe(1);
});
