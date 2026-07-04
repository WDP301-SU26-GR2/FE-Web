import { STORAGE_KEYS } from '~/shared/config/site'
import { env } from '~/shared/config/env'
import { readStorage, writeStorage, removeStorage } from '~/shared/lib/storage'

/** Raw error shape thrown by this mutator. */
export type FetchError = Error & {
  status: number
  /** Parsed BE error body — follows { message: string, errors?: [] } */
  data: { message: string; errors?: Array<{ message: string; path?: string }> }
}

/** True when the BE returned an error (non-2xx). */
export function isFetchError(err: unknown): err is FetchError {
  return (
    err instanceof Error &&
    typeof (err as FetchError).status === 'number' &&
    typeof (err as FetchError).data?.message === 'string'
  )
}

async function doRefreshToken(): Promise<boolean> {
  const refreshToken = readStorage(STORAGE_KEYS.refreshToken)
  if (!refreshToken) return false

  try {
    const base =
      env.API_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')
    const res = await fetch(new URL('/auth/refresh-token', base).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken })
    })

    if (!res.ok) {
      removeStorage(STORAGE_KEYS.accessToken)
      removeStorage(STORAGE_KEYS.refreshToken)
      return false
    }

    const json = await res.json()
    // Refresh trả { success, message, data: { accessToken, refreshToken } }
    const payload = json?.data
    if (!payload?.accessToken) return false

    writeStorage(STORAGE_KEYS.accessToken, payload.accessToken)
    writeStorage(STORAGE_KEYS.refreshToken, payload.refreshToken)
    return true
  } catch {
    return false
  }
}

/**
 * Custom fetch mutator — Orval v7 calls this instead of raw fetch.
 *
 * BE response envelope: { success: true, message: "Success", data: <payload> }
 *   → unwrap: return { data: payload }
 * BE error:           { success: false, message: string, errors?: [] }
 *   → throw FetchError
 *
 * Responsibilities:
 *   - Attach base URL (env.API_URL).
 *   - Inject `Authorization: Bearer <token>` from localStorage.
 *   - Unwrap BE envelope: { success, data } → { data } for Orval consumers.
 *   - Throw typed `FetchError` on non-OK / { success: false } responses.
 *   - Retry once on 401 by refreshing the token.
 *   - Handle 204 No Content.
 */
export async function customFetch<T>(
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
): Promise<T> {
  const base =
    env.API_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')

  const fullUrl = new URL(url, base)

  // Handle query params
  const params = options?.params
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        fullUrl.searchParams.append(key, String(value))
      }
    })
  }

  // Build headers
  const incomingHeaders = options?.headers
  let finalHeaders: Record<string, string> = {}

  if (incomingHeaders instanceof Headers) {
    incomingHeaders.forEach((value, key) => {
      finalHeaders[key] = value
    })
  } else if (Array.isArray(incomingHeaders)) {
    finalHeaders = Object.fromEntries(incomingHeaders)
  } else if (incomingHeaders) {
    finalHeaders = { ...incomingHeaders }
  }

  finalHeaders['Content-Type'] = 'application/json'
  finalHeaders.Accept = 'application/json'

  // Inject Bearer token
  const token = readStorage(STORAGE_KEYS.accessToken)
  if (token && !finalHeaders['Authorization']) {
    finalHeaders['Authorization'] = `Bearer ${token}`
  }

  const fetchOptions: RequestInit = {
    method: (options?.method ?? 'GET').toUpperCase(),
    headers: finalHeaders,
    body: options?.body ?? (options?.data !== undefined ? JSON.stringify(options.data) : undefined),
    signal: options?.signal
  }

  const performFetch = async (): Promise<Response> => fetch(fullUrl.toString(), fetchOptions)

  let res = await performFetch()

  // ── 401 → retry once with refreshed token ─────────────────────────────────
  if (res.status === 401) {
    const refreshed = await doRefreshToken()
    if (refreshed) {
      const newToken = readStorage(STORAGE_KEYS.accessToken)
      if (newToken) {
        fetchOptions.headers = { ...fetchOptions.headers, Authorization: `Bearer ${newToken}` }
      }
      res = await performFetch()
    }
  }

  // ── Parse raw body ───────────────────────────────────────────────────────
  const raw = res.status === 204 ? null : await res.json().catch(() => null)

  // ── Non-2xx or { success: false } → throw error ─────────────────────────
  if (!res.ok || raw?.success === false) {
    let errorBody: { message: string; errors?: Array<{ message: string; path?: string }> } = {
      message: res.statusText || 'API error'
    }

    if (raw?.message && typeof raw.message === 'string') {
      errorBody = { message: raw.message, errors: raw.errors }
    }

    throw Object.assign(new Error(errorBody.message), {
      status: res.status,
      data: errorBody
    }) as FetchError
  }

  // ── 204 ─────────────────────────────────────────────────────────────────
  if (res.status === 204) return { data: undefined, status: 204 } as T

  // ── Success: unwrap envelope { success, data } → { data } ────────────────
  // raw = { success: true, message: "Success", data: <payload> }
  const payload = raw?.data

  return { data: payload, status: res.status } as T
}
