import { env } from "~/shared/config/env";

type RequestOptions = {
  url: string;
  method: string;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
  signal?: AbortSignal;
};

/**
 * Custom fetch mutator — Orval sẽ gọi hàm này thay vì fetch thô.
 *
 * Nhiệm vụ:
 *   - Gắn base URL (env.API_URL).
 *   - Gắn Content-Type mặc định.
 *   - Gắn Authorization header (sau khi có auth).
 *   - Serialize query params và body.
 *   - Throw lỗi khi response không OK (Orval expect điều này).
 *
 * Khi có auth, inject token ở đây:
 *   const token = getAuthToken(); // từ cookie / localStorage
 *   headers["Authorization"] = `Bearer ${token}`;
 */
export async function customFetch<T>(options: RequestOptions): Promise<T> {
  const { url, method, headers = {}, params, data, signal } = options;

  // Khi API_URL rỗng (mock mode) → resolve tương đối với origin hiện tại.
  // Khi API_URL có giá trị → coi như base absolute, url là path tương đối.
  const base =
    env.API_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:5173");
  const fullUrl = new URL(url, base);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        fullUrl.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(fullUrl.toString(), {
    method: method.toUpperCase(),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw Object.assign(new Error(error?.message ?? "API error"), {
      status: response.status,
      data: error,
    });
  }

  // 204 No Content — không có body
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
