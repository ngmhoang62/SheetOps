/** Server-side transport: bounded upstream waits and opt-in non-sensitive timings. */
export const upstreamFetch: typeof fetch = async (input, init) => {
  const started = performance.now();
  const inherited =
    init?.signal ?? (input instanceof Request ? input.signal : null);
  const signal = AbortSignal.any([
    AbortSignal.timeout(12000),
    ...(inherited ? [inherited] : []),
  ]);
  let status: number | undefined;
  try {
    const response = await fetch(input, { ...init, signal });
    status = response.status;
    return response;
  } finally {
    if (process.env.PERF_DIAGNOSTICS === "1") {
      const path = new URL(input instanceof Request ? input.url : String(input))
        .pathname;
      const operation = path.startsWith("/auth/")
        ? "auth"
        : path.startsWith("/rest/")
          ? "database"
          : "other";
      console.info(
        JSON.stringify({
          upstream: operation,
          status,
          elapsedMs: Math.round(performance.now() - started),
        }),
      );
    }
  }
};
