import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { taskControllerGetTaskFileDownloadUrl } from '~/api/operations/task/task'
import type { TaskFileDownloadResDtoOutput } from '~/api/model/task'

/**
 * Result for a single signed-URL lookup for task files.
 * Uses `POST /tasks/:id/download-url` which is authorized based on
 * the user's relationship to the task (Mangaka/Assistant/Editor/Board/Admin).
 *
 * IMPORTANT (FE-API-Guide-v3.md §6, 2026-07-21):
 * - `pageOriginalFile` (Mangaka's original page) requires this route
 *   because Mangaka is not the uploader.
 * - `versions[].file` (Assistant's submitted files) also requires this route
 *   because the signed URL from `/uploads/sign-download` will return 403
 *   for files uploaded by other users.
 *
 * Do NOT use `/uploads/sign-download` for task-related images.
 */
export type TaskSignedUrlState =
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
 * Process-level cache so multiple components asking for the same (taskId, key)
 * pair reuse the same in-flight promise (avoids duplicate API calls).
 */
type CacheEntry = { url: string; expiresAtMs: number }
const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<string>>()

function makeCacheKey(taskId: string, key: string): string {
  return `${taskId}:${key}`
}

async function signTaskFile(
  taskId: string,
  key: string,
  callerSignal?: AbortSignal
): Promise<string> {
  const cacheKey = makeCacheKey(taskId, key)
  const now = Date.now()
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAtMs > now) {
    return cached.url
  }

  const existing = inflight.get(cacheKey)
  if (existing) {
    return waitForInFlight(existing, callerSignal)
  }

  const promise = (async () => {
    const res = await taskControllerGetTaskFileDownloadUrl({ id: taskId }, { key })
    const data = res.data as TaskFileDownloadResDtoOutput
    const url = data.downloadUrl
    const expiresAtIso = data.expiresAt
    const expiry = expiresSoon(expiresAtIso)
    cache.set(cacheKey, { url, expiresAtMs: expiry })
    return url
  })()

  inflight.set(cacheKey, promise)
  try {
    const url = await promise
    return url
  } catch (err) {
    cache.delete(cacheKey)
    throw err
  } finally {
    if (inflight.get(cacheKey) === promise) inflight.delete(cacheKey)
  }
}

function makeAbortError(): Error {
  const err = new Error('Aborted')
  err.name = 'AbortError'
  return err
}

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

/**
 * Resolve an R2 object key belonging to a task to a presigned GET URL.
 *
 * This hook handles two types of images in a task:
 * 1. `pageOriginalFile` — the original page image uploaded by Mangaka
 * 2. `versions[].file` — submitted work files uploaded by Assistant
 *
 * Both require `POST /tasks/:id/download-url` because:
 * - Mangaka cannot use `/uploads/sign-download` for Assistant's uploaded files
 * - Assistant cannot use `/uploads/sign-download` for Mangaka's uploaded files
 *
 * Behaviour:
 *   - `key` falsy (null/empty) → returns `status: 'idle'` (no fetch)
 *   - On success, also auto-refreshes shortly before the URL expires
 *   - The component-local AbortController is honoured for this caller's state updates
 */
export function useTaskSignedUrl(
  taskId: string | undefined,
  key: string | null | undefined
): TaskSignedUrlState {
  const { t } = useTranslation('common')
  const [state, setState] = useState<TaskSignedUrlState>(
    () => (taskId && key ? { status: 'loading' } : { status: 'idle' })
  )

  useEffect(() => {
    if (!taskId || !key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'idle' })
      return
    }

    const controller = new AbortController()
    let cancelled = false
    let refreshTimer: ReturnType<typeof setTimeout> | null = null

    const run = async () => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'loading' })
      try {
        const url = await signTaskFile(taskId, key, controller.signal)
        if (cancelled) return

        const cacheKey = makeCacheKey(taskId, key)
        const entry = cache.get(cacheKey)
        const expiresAt = entry
          ? new Date(entry.expiresAtMs + 60_000).toISOString()
          : ''
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({ status: 'ready', url, expiresAt })

        // Schedule a refresh slightly before expiry
        if (entry) {
          const delay = Math.max(entry.expiresAtMs - Date.now() - 30_000, 5_000)
          refreshTimer = setTimeout(() => {
            if (!cancelled) void run()
          }, delay)
        }
      } catch (err) {
        if (cancelled) return
        if (controller.signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
  }, [taskId, key, t])

  return state
}
