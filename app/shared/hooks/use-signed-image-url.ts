import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { storageControllerSignDownload } from '~/api/operations/uploads/uploads'
import type { SignDownloadResDtoOutput } from '~/api/model/uploads'

/**
 * Result for a single signed-URL lookup. `status: 'idle'` is for keys that
 * are nullish/empty (no request ever fired).
 */
type SignedUrlState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; url: string; expiresAt: string }
  | { status: 'error'; message: string }

/**
 * Convert an ISO datetime + a safety margin to an absolute epoch ms.
 * `marginSec` default = 60s. We refresh before expiry so an `<img>` never
 * loads a URL that's about to die.
 */
function expiresSoon(iso: string, marginSec = 60): number {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return Date.now() + 5 * 60_000
  return ts - marginSec * 1000
}

/**
 * Process-level cache so multiple components asking for the same key reuse the
 * same in-flight promise (avoids duplicate API calls).
 *
 * Cache entries are kept until `expiresAt - safety-margin`. After that, the
 * next caller will trigger a fresh sign.
 *
 * The in-flight fetch is intentionally **detached from any per-caller abort
 * signal**. Why: under React 19 StrictMode every effect mounts→unmounts→
 * remounts in quick succession. If the in-flight fetch is tied to the first
 * mount's signal it gets aborted on cleanup, the cache entry is cleared, but
 * a fresh remount may grab the same aborted promise before the cache cleanup
 * microtask runs. The remount then awaits an already-rejected promise and
 * silently drops the result (the catch block treats AbortError as "I was the
 * one who aborted"), leaving `<SignedImage>` stuck in `loading` forever.
 *
 * Decoupling means: the fetch runs to completion regardless of how many
 * components subscribe to it; subscribers can still cancel their own UI
 * updates via the local `cancelled` flag, but they never kill an in-flight
 * fetch that other subscribers may still be waiting on.
 */
type CacheEntry = { url: string; expiresAtMs: number }
const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<string>>()

async function signKey(key: string, callerSignal?: AbortSignal): Promise<string> {
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && cached.expiresAtMs > now) {
    return cached.url
  }
  const existing = inflight.get(key)
  if (existing) {
    return await waitForInFlight(existing, callerSignal)
  }

  // Start a fresh fetch with NO caller signal — the promise is shared.
  // Errors only remove the entry from the in-flight map; we don't abort the
  // underlying request since other subscribers may still be waiting on it.
  const promise = (async () => {
    const res = await storageControllerSignDownload({ key })
    const url = (res.data as SignDownloadResDtoOutput).downloadUrl
    const expiresAtIso = (res.data as SignDownloadResDtoOutput).expiresAt
    const expiry = expiresSoon(expiresAtIso)
    cache.set(key, { url, expiresAtMs: expiry })
    return url
  })()

  inflight.set(key, promise)
  try {
    const url = await promise
    return url
  } catch (err) {
    cache.delete(key)
    throw err
  } finally {
    // Whether it resolved or rejected, the in-flight slot is now free. On
    // success the cached URL is stored above; on failure we cleared both.
    if (inflight.get(key) === promise) inflight.delete(key)
  }
}

/**
 * Wait for an in-flight sign promise but bail out if the caller's signal
 * aborts. Used to honour per-caller cancellation without killing the shared
 * fetch that other callers may still be waiting on.
 */
function waitForInFlight(promise: Promise<string>, signal?: AbortSignal): Promise<string> {
  if (!signal) return promise
  if (signal.aborted) {
    return Promise.reject(makeAbortError())
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(makeAbortError())
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (url) => {
        signal.removeEventListener('abort', onAbort)
        resolve(url)
      },
      (err) => {
        signal.removeEventListener('abort', onAbort)
        reject(err)
      }
    )
  })
}

function makeAbortError(): Error {
  const err = new Error('Aborted')
  err.name = 'AbortError'
  return err
}

/**
 * Resolve an R2 object key to a presigned GET URL.
 *
 * Behaviour:
 *   - `key` falsy (null/empty) → returns `status: 'idle'` (no fetch).
 *   - On success, also auto-refreshes shortly before the URL expires.
 *   - The component-local AbortController is honoured only for THIS caller's
 *     state updates (no `setState` after unmount); it does not abort the
 *     shared fetch.
 *   - Errors surface via `status: 'error'` (and a `message`).
 */
export function useSignedImageUrl(key: string | null | undefined): SignedUrlState {
  const { t } = useTranslation('common')
  const [state, setState] = useState<SignedUrlState>(() => (key ? { status: 'loading' } : { status: 'idle' }))

  useEffect(() => {
    // setState is called synchronously below to handle the key→falsy transition
    // (no fetch needed). The ESLint rule flags every direct setState in effect
    // bodies; suppressing here is safe because no synchronous side effect follows.
    if (!key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'idle' })
      return
    }

    const controller = new AbortController()
    let cancelled = false
    let refreshTimer: ReturnType<typeof setTimeout> | null = null

    const run = async () => {
      setState({ status: 'loading' })
      try {
        const url = await signKey(key, controller.signal)
        if (cancelled) return
        const entry = cache.get(key)
        const expiresAt = entry ? new Date(entry.expiresAtMs + 60_000).toISOString() : ''
        setState({ status: 'ready', url, expiresAt })

        // Schedule a refresh slightly before expiry so the next render still
        // has a valid URL.
        if (entry) {
          const delay = Math.max(entry.expiresAtMs - Date.now() - 30_000, 5_000)
          refreshTimer = setTimeout(() => {
            if (!cancelled) void run()
          }, delay)
        }
      } catch (err) {
        if (cancelled) return
        // The shared fetch wasn't aborted by this caller, but signal.aborted
        // also catches the case where the caller (this component) aborted
        // *after* `signKey` returned the cached URL/promise. Bail silently
        // in either case.
        if (controller.signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : t('errors.unknown')
        })
      }
    }

    void run()

    return () => {
      cancelled = true
      controller.abort()
      if (refreshTimer) clearTimeout(refreshTimer)
    }
  }, [key, t])

  return state
}
