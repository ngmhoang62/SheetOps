"use client";
import { useCallback, useEffect, useState } from "react";
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
  if (!response.ok)
    throw new ApiError(
      result.error?.message ?? "Không thể xử lý yêu cầu.",
      response.status,
      result.error?.fields,
      result.error?.code,
    );
  return result.data as T;
}
export function useResource<T>(url: string | null, revision = 0) {
  const [state, setState] = useState<{
    data: T | null;
    error: string;
    loading: boolean;
  }>({ data: null, error: "", loading: !!url });
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reflect the pending external request when its URL changes
    setState({ data: null, error: "", loading: true });
    api<T>(url, { signal: controller.signal })
      .then((data) => setState({ data, error: "", loading: false }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ data: null, error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [url, revision]);
  const clear = useCallback(
    () => setState({ data: null, error: "", loading: false }),
    [],
  );
  return { ...state, clear };
}
