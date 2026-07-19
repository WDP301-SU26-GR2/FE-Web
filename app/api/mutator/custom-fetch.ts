import type { AxiosRequestConfig } from 'axios'

import { STORAGE_KEYS } from '~/shared/config/site'
import { removeStorage } from '~/shared/lib/storage'
import { httpClient } from './axios-client'

export { isFetchError, type FetchError } from './axios-client'

/**
 * Custom fetch mutator — Orval v7 calls this instead of raw fetch.
 *
 * This is a thin **adapter**: it keeps the fetch-like signature
 * `(url, options) => Promise<T>` that Orval expects, but the actual
 * HTTP work is delegated to the shared Axios client (see ./axios-client.ts).
 *
 * BE response envelope: { success: true, message: "Success", data: <payload> }
 *   → unwrap: return { data: payload }
 * BE error:           { success: false, code: string, message: string, errors?: [] }
 *   → throw FetchError
 *
 * Responsibilities (delegated to the axios client + interceptors):
 *   - Attach base URL (env.API_URL).
 *   - Inject `Authorization: Bearer <token>` from localStorage.
 *   - Unwrap BE envelope: { success, data } → { data } for Orval consumers.
 *   - Throw typed `FetchError` on non-OK / { success: false } responses.
 *   - Retry once on 401 by refreshing the token.
 *   - Handle 204 No Content.
 *
 * Locally, this adapter still:
 *   - Normalizes Orval's `options` (Headers, Array, Object) into Axios config.
 *   - Maps `options.params` → axios `params`.
 *   - Maps `options.data` / `options.body` → axios `data` (JSON.stringify for objects).
 *   - Converts non-2xx Axios errors into the project's `FetchError` shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function customFetch<T>(url: string, options?: any): Promise<T> {
  const config: AxiosRequestConfig = {
    url,
    method: (options?.method ?? 'GET').toUpperCase()
  }

  // Query params — axios handles serialization for us.
  if (options?.params) {
    config.params = options.params
  }

  // Headers — Orval may pass Headers, Array, or plain object. We only keep
  // headers the caller explicitly set; auth + content-type are added by the
  // axios interceptors / defaults so we don't double-set them here.
  const incomingHeaders = options?.headers
  if (incomingHeaders) {
    config.headers = {}
    if (incomingHeaders instanceof Headers) {
      incomingHeaders.forEach((value, key) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(config.headers as any)[key] = value
      })
    } else if (Array.isArray(incomingHeaders)) {
      for (const [key, value] of incomingHeaders) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(config.headers as any)[key] = value
      }
    } else {
      config.headers = { ...incomingHeaders }
    }
  }

  // Body — Orval passes either `body` (raw) or `data` (payload to stringify).
  if (options?.body !== undefined) {
    config.data = options.body
  } else if (options?.data !== undefined) {
    config.data =
      typeof options.data === 'string' ? options.data : JSON.stringify(options.data)
  }

  if (options?.signal) {
    config.signal = options.signal
  }

  try {
    const res = await httpClient.request(config)
    const status = res.status
    const raw = res.data

    // ── 204 No Content ─────────────────────────────────────────────────
    if (status === 204) {
      return { data: undefined, status } as T
    }

    // ── BE envelope: { success, message, data } ────────────────────────
    // Contract: every 2xx response from the BE is wrapped. Orval-generated
    // types declare `data: <payload>` directly, so we MUST strip one layer.
    //
    //   BE:    { success: true, message: "Success", data: <payload> }
    //   FE:    { data: <payload>, status: 201 }
    //
    // Some endpoints return `data: null` (e.g. delete) — caller should still
    // receive { data: null, status }.
    if (raw && typeof raw === 'object' && 'success' in raw) {
      if (raw.success === false) {
        // BE returned 2xx but flagged the call as a failure — surface as
        // FetchError so call sites can use extractApiErrorMessage.
        throw normalizeAxiosError({
          response: { status, data: raw },
          message: raw.message || 'API error'
        })
      }
      return { data: raw.data, status } as T
    }

    // Fallback: response doesn't follow the envelope contract. Pass raw
    // through so callers that expect a non-wrapped payload still work.
    return { data: raw, status } as T
  } catch (err) {
    throw normalizeAxiosError(err)
  }
}

/**
 * Convert an Axios error into the project's `FetchError` shape so existing
 * call sites (`isFetchError`, `extractApiErrorMessage`, ...) keep working.
 *
 * Also clears the stored tokens when the BE explicitly invalidates the
 * session (401 with no refresh-token recovery).
 */
function normalizeAxiosError(err: unknown): Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const axiosErr = err as any
  const status: number = axiosErr?.response?.status ?? 0
  const raw = axiosErr?.response?.data

  let errorBody: {
    code?: string
    message: string
    errors?: Array<{ code?: string | null; message: string; path?: string }>
    retryAfter?: number
  } = {
    message: axiosErr?.message || 'API error'
  }

  if (raw && typeof raw === 'object' && typeof raw.message === 'string') {
    errorBody = {
      code: typeof raw.code === 'string' ? raw.code : undefined,
      message: raw.message,
      errors: raw.errors,
      retryAfter: typeof raw.retryAfter === 'number' ? raw.retryAfter : undefined
    }
  }

  if (status === 401) {
    removeStorage(STORAGE_KEYS.accessToken)
    removeStorage(STORAGE_KEYS.refreshToken)
  }

  const fetchError = Object.assign(new Error(errorBody.message), {
    status,
    data: errorBody
  }) as Error & { status: number; data: typeof errorBody }

  return fetchError
}
