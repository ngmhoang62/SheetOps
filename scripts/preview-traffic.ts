import type { BrowserContext } from "@playwright/test";
import {
  closeSync,
  mkdirSync,
  openSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

export function previewOrigin() {
  const value = process.env.PREVIEW_ORIGIN;
  if (!value) throw new Error("Explicit PREVIEW_ORIGIN required");
  const parsed = new URL(value);
  if (
    parsed.protocol !== "https:" ||
    parsed.origin !== value ||
    parsed.username ||
    parsed.password
  )
    throw new Error("PREVIEW_ORIGIN must be an HTTPS origin");
  if (
    !process.env.PRODUCTION_APP_ORIGIN ||
    value === process.env.PRODUCTION_APP_ORIGIN
  )
    throw new Error("Independent Preview origin required");
  return value;
}

export function lockPreview() {
  mkdirSync("output/performance", { recursive: true });
  const path = "output/performance/preview-test.lock";
  let fd: number;
  try {
    fd = openSync(path, "wx");
  } catch {
    throw new Error(
      "Preview test already locked; inspect the recorded PID before removing a stale lock",
    );
  }
  writeFileSync(fd, String(process.pid));
  return () => {
    closeSync(fd);
    unlinkSync(path);
  };
}

/** Separate bounded lanes avoid Flight/module dependency deadlocks. No retries. */
export class PreviewTraffic {
  private tails = [Promise.resolve(), Promise.resolve()];
  private lastStarts: (number | null)[] = [null, null];
  private active = [0, 0];
  private contexts = new Set<BrowserContext>();
  private prefetchPath: string | null = null;
  readonly stats = {
    requests: 0,
    applicationRequests: 0,
    peakConcurrency: 0,
    peakApplicationConcurrency: 0,
    peakAssetConcurrency: 0,
    skippedPrefetch: 0,
    headerOnlyRoutes: 0,
  };
  blocked: string | null = null;

  constructor(
    private readonly clock = {
      now: () => Date.now(),
      wait: (ms: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, ms)),
    },
    private readonly limits = {
      total: 80,
      application: 24,
      appGap: 2000,
      assetGap: 150,
    },
  ) {}

  stop(reason: string) {
    if (this.blocked) return;
    this.blocked = reason;
    for (const context of this.contexts) void context.close().catch(() => {});
  }

  focusRoute(path: string) {
    this.prefetchPath = path;
  }

  async run<T>(application: boolean, operation: () => Promise<T>): Promise<T> {
    const lane = application ? 0 : 1;
    const previous = this.tails[lane];
    let release!: () => void;
    this.tails[lane] = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      if (this.blocked) throw new Error(this.blocked);
      if (
        this.stats.requests >= this.limits.total ||
        (application &&
          this.stats.applicationRequests >= this.limits.application)
      ) {
        this.stop("PREVIEW_TRAFFIC_BUDGET");
        throw new Error(this.blocked!);
      }
      const lastStart = this.lastStarts[lane];
      if (lastStart !== null)
        await this.clock.wait(
          Math.max(
            0,
            lastStart +
              (application ? this.limits.appGap : this.limits.assetGap) -
              this.clock.now(),
          ),
        );
      if (this.blocked) throw new Error(this.blocked);
      // Another lane may have spent the last budget slot while this lane waited.
      if (
        this.stats.requests >= this.limits.total ||
        (application &&
          this.stats.applicationRequests >= this.limits.application)
      ) {
        this.stop("PREVIEW_TRAFFIC_BUDGET");
        throw new Error(this.blocked!);
      }
      this.lastStarts[lane] = this.clock.now();
      this.stats.requests++;
      if (application) this.stats.applicationRequests++;
      this.active[lane]++;
      this.stats.peakConcurrency = Math.max(
        this.stats.peakConcurrency,
        this.active[0] + this.active[1],
      );
      this.stats.peakApplicationConcurrency = Math.max(
        this.stats.peakApplicationConcurrency,
        this.active[0],
      );
      this.stats.peakAssetConcurrency = Math.max(
        this.stats.peakAssetConcurrency,
        this.active[1],
      );
      try {
        return await operation();
      } finally {
        this.active[lane]--;
      }
    } finally {
      release();
    }
  }

  async attach(
    context: BrowserContext,
    token?: string,
    origin = previewOrigin(),
  ) {
    if (origin !== "http://127.0.0.1:3001" && origin !== previewOrigin())
      throw Error("Unsupported smoke origin");
    this.contexts.add(context);
    context.on("close", () => this.contexts.delete(context));
    await context.route(origin + "/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const asset =
        path.startsWith("/_next/static/") ||
        /\.(?:svg|png|jpe?g|webp|ico|woff2?)$/.test(path);
      const headers = route.request().headers();
      const prefetch =
        headers["next-router-prefetch"] === "1" ||
        "next-router-segment-prefetch" in headers ||
        (headers.purpose ?? headers["sec-purpose"] ?? "").includes("prefetch");
      if (this.prefetchPath && prefetch && path !== this.prefetchPath) {
        this.stats.skippedPrefetch++;
        await route.abort("aborted").catch(() => {});
        return;
      }
      try {
        await this.run(!asset, async () => {
          const request = route.request();
          await route.continue({
            headers: {
              ...request.headers(),
              ...(token &&
              origin !== "http://127.0.0.1:3001" &&
              origin === previewOrigin()
                ? { "x-vercel-trusted-oidc-idp-token": token }
                : {}),
            },
          });
          const response = await request.response();
          if (response) {
            if (response.status() === 429) this.stop("PREVIEW_RATE_LIMIT");
            const mitigated = response.headers()["x-vercel-mitigated"];
            if (
              mitigated === "challenge" ||
              (response.status() === 403 &&
                (await response.text().catch(() => "")).includes(
                  "Vercel Security Checkpoint",
                ))
            )
              this.stop("VERCEL_SECURITY_CHECKPOINT");
            // Flight streams can depend on client modules/API reads. Holding
            // their entire body here would deadlock the browser we are testing.
            if (asset || path.startsWith("/api/"))
              await response.finished().catch(() => {});
            else this.stats.headerOnlyRoutes++;
          }
        });
      } catch {
        await route.abort("blockedbyclient").catch(() => {});
      }
    });
  }
}

export function benchmarkPlan(
  base: string,
  env: Record<string, string | undefined>,
) {
  const online = base !== "http://127.0.0.1:3001" && base === previewOrigin();
  const integer = (name: string, fallback: number, max: number) => {
    const value = Number(env[name] ?? fallback);
    if (
      !Number.isInteger(value) ||
      value < (name === "PERF_API_SAMPLES" ? 0 : 1) ||
      value > max
    )
      throw new Error("Invalid or excessive benchmark setting: " + name);
    return value;
  };
  const plan = {
    cycles: integer("PERF_CYCLES", online ? 1 : 20, online ? 1 : 50),
    logins: integer("PERF_LOGIN_SAMPLES", 1, online ? 1 : 30),
    apiSamples: integer("PERF_API_SAMPLES", 0, online ? 0 : 30),
    count: integer("PERF_ORDER_COUNT", 300, online ? 300 : 2000),
  };
  if (
    ![300, 2000].includes(plan.count) ||
    (online && env.PERF_RESPONSIVE === "1")
  )
    throw new Error("Preview scale/responsive loops are local-only");
  return plan;
}
