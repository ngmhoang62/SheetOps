"use client";
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string[]>,
    public code?: string,
  ) {
    super(message);
  }
}
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    if (
      [401, 403].includes(response.status) &&
      url !== "/api/session" &&
      typeof window !== "undefined"
    )
      window.dispatchEvent(
        new CustomEvent("workspace-access", {
          detail: { status: response.status, code: result.error?.code },
        }),
      );
    throw new ApiError(
      result.error?.message ?? "Không thể xử lý yêu cầu.",
      response.status,
      result.error?.fields,
      result.error?.code,
    );
  }
  return result.data as T;
}
export function useResource<T>(
  url: string | null,
  _revision = 0,
  enabled = true,
) {
  void _revision; // Compatibility: workspace mutations now invalidate selected query families.
  const client = useQueryClient();
  const query = useQuery<T>({
    queryKey: [url],
    enabled: !!url && enabled,
    queryFn: ({ signal }) => api<T>(url!, { signal }),
    placeholderData: (previous, previousQuery) =>
      url &&
      url.split("?")[0] === String(previousQuery?.queryKey[0]).split("?")[0]
        ? previous
        : undefined,
  });
  const denied =
    query.error instanceof ApiError && [401, 403].includes(query.error.status);
  const clear = useCallback(
    () => client.removeQueries({ queryKey: [url], exact: true }),
    [client, url],
  );
  return {
    data: denied ? null : (query.data ?? null),
    error: query.error?.message ?? "",
    loading: query.isPending && !query.data,
    refreshing: query.isFetching && !!query.data,
    previous: query.isPlaceholderData,
    retry: query.refetch,
    clear,
  };
}
