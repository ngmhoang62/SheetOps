import { QueryClient } from "@tanstack/react-query";

export function createSessionQueryClient(scope: string) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        meta: { scope },
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (count, error) =>
          count < 1 &&
          ![401, 403, 404, 422].includes(
            (error as { status?: number }).status ?? 0,
          ),
        refetchOnWindowFocus: true,
      },
    },
  });
}

export function affectedResource(url: string, domain: string) {
  const path = url.split("?")[0];
  if (domain === "orders")
    return /^\/api\/(orders|dashboard|reports|audit)/.test(path);
  if (domain === "users") return /^\/api\/(users|audit)/.test(path);
  if (domain === "sync")
    return /^\/api\/(sync|audit|orders|dashboard|reports)/.test(path);
  if (domain === "settings")
    return /^\/api\/(settings|session|audit)/.test(path);
  return true;
}
