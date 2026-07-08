import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

import { STORAGE_KEYS } from '~/shared/config/site'
import { env } from '~/shared/config/env'
import { readStorage, writeStorage, removeStorage } from '~/shared/lib/storage'

/**
 * Raw error shape thrown by the customFetch adapter.
 *
 * Call sites that need to branch on HTTP status (e.g. 404 → not-found UI)
 * should narrow with {@link isFetchError}. Everything else can rely on
 * `error.message` being a human-readable BE string.
 */
export type FetchError = Error & {
  status: number
  /** Parsed BE error body — follows { message: string, errors?: [] } */
  data: { message: string; errors?: Array<{ message: string; path?: string }> }
}

/** True when the BE returned an error (non-2xx or { success: false }). */
export function isFetchError(err: unknown): err is FetchError {
  return (
    err instanceof Error &&
    typeof (err as FetchError).status === 'number' &&
    typeof (err as FetchError).data?.message === 'string'
  )
}

const REFRESH_FLAG = '__mangaka_isRefreshing'

/**
 * Resolve the API base URL.
 * - Production / staging: env.API_URL
 * - Dev fallback: window.location.origin so MSW + relative `/api` work
 */
function resolveBaseURL(): string {
  if (env.API_URL) return env.API_URL
  if (typeof window !== 'undefined') return window.location.origin
  return 'http://localhost:5173'
}

/**
 * Try to refresh the access token using the stored refresh token.
 * Returns true on success (tokens updated in storage), false otherwise.
 */
async function doRefreshToken(): Promise<boolean> {
  const refreshToken = readStorage(STORAGE_KEYS.refreshToken)
  if (!refreshToken) return false

  try {
    const base = resolveBaseURL()
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

    const json = (await res.json()) as {
      data?: { accessToken?: string; refreshToken?: string }
    }
    const payload = json?.data
    if (!payload?.accessToken || !payload?.refreshToken) return false

    writeStorage(STORAGE_KEYS.accessToken, payload.accessToken)
    writeStorage(STORAGE_KEYS.refreshToken, payload.refreshToken)
    return true
  } catch {
    return false
  }
}

/**
 * Shared Axios instance used by the customFetch adapter.
 *
 * Behavior preserved from the previous native-fetch mutator:
 *   - baseURL from env.API_URL (falls back to window.location.origin)
 *   - Auto-inject `Authorization: Bearer <accessToken>` from localStorage
 *   - On 401: try one silent refresh, then retry the original request.
 *
 * Response shape unwrapping happens in `custom-fetch.ts`, NOT here, so that
 * this file stays a pure HTTP transport.
 */
export const httpClient: AxiosInstance = axios.create({
  baseURL: resolveBaseURL(),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
  // No `transformResponse` override — let Axios parse the JSON body so
  // `res.data` is an object. Custom envelope unwrapping lives in
  // `custom-fetch.ts` instead.
})

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.headers.has('Authorization')) return config
  const token = readStorage(STORAGE_KEYS.accessToken)
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { [REFRESH_FLAG]?: boolean })
      | undefined

    // ── 401 → silent refresh + retry once ───────────────────────────────
    if (error.response?.status === 401 && original && !original[REFRESH_FLAG]) {
      const refreshed = await doRefreshToken()
      if (refreshed) {
        original[REFRESH_FLAG] = true
        const newToken = readStorage(STORAGE_KEYS.accessToken)
        if (newToken) {
          original.headers.set('Authorization', `Bearer ${newToken}`)
        }
        return httpClient.request(original)
      }
    }

    throw error
  }
)
