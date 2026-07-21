import { useCallback, useEffect, useRef, useState } from 'react'

import { notificationControllerList } from '~/api/operations/notifications/notifications'
import type { LoginResDtoOutputUserRole } from '~/api/model/auth'

/** Default per FE-API-Guide-v3 §0.7: polling 10–30s for notification badge. */
const DEFAULT_POLL_INTERVAL_MS = 25_000

type UseUnreadNotificationsOptions = {
  /** Polling interval in ms. Default 25s — within the §0.7 10–30s range. */
  pollIntervalMs?: number
  /** Disable polling (e.g. user not authenticated). */
  enabled?: boolean
}

type UseUnreadNotificationsResult = {
  unreadCount: number
  /**
   * Forces an immediate refresh of `unreadCount`. Use this after a successful
   * `markRead` / `markAllRead` so the bell dot reflects the new state without
   * waiting for the next polling tick.
   */
  refresh: () => void
}

/**
 * Polls the notifications endpoint and exposes `unreadCount` for the bell badge.
 *
 * Endpoint scope is locked server-side to the authenticated user; we therefore
 * drive the same endpoint regardless of role. Used by `NotificationBell` in the
 * shared dashboard layout — see FE-API-Guide-v3 §0.7 (realtime = polling).
 *
 * Lifecycle:
 *  - On mount, fetches once (unless `enabled === false`).
 *  - Then re-fetches every `pollIntervalMs`.
 *  - On `unmount` or dependency change, aborts any in-flight request and
 *    clears the polling timer so we never fire after the user logs out or
 *    switches sessions.
 *
 * The hook intentionally uses `notificationControllerList(..., { signal })` so
 * a slow response can't race against a newer one.
 */
export function useUnreadNotifications(options: UseUnreadNotificationsOptions = {}): UseUnreadNotificationsResult {
  const { pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, enabled = true } = options

  const [unreadCount, setUnreadCount] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const fetchUnread = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await notificationControllerList({ limit: 1, offset: 0 }, { signal })
      if (signal.aborted) return
      setUnreadCount(res.data.unreadCount)
    } catch {
      // Silent — bell dot is best-effort. Don't surface a toast for every
      // failed poll; the notifications page itself will render an error
      // banner if a manual fetch fails.
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState happens inside the awaited function
    void fetchUnread(signal)

    const timer = window.setInterval(() => {
      // Re-arm a fresh signal so the previous timer-triggered fetch can still
      // be aborted if it's somehow still in-flight (e.g. extremely slow network).
      abortRef.current?.abort()
      const c = new AbortController()
      abortRef.current = c
      void fetchUnread(c.signal)
    }, pollIntervalMs)

    // External invalidation hook: any other screen can dispatch
    // NOTIFICATIONS_REFRESH_EVENT after a markRead/markAllRead to make the
    // bell dot update instantly without waiting for the next poll tick.
    const onExternalRefresh = () => {
      abortRef.current?.abort()
      const c = new AbortController()
      abortRef.current = c
      void fetchUnread(c.signal)
    }
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onExternalRefresh)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onExternalRefresh)
      abortRef.current?.abort()
    }
  }, [enabled, pollIntervalMs, reloadToken, fetchUnread])

  const refresh = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  return { unreadCount, refresh }
}

/** Custom DOM event fired when the user just marked notifications read on
 *  any screen. Other surfaces (e.g. the bell badge) listen for it to trigger
 *  an immediate refresh instead of waiting for the polling tick. */
export const NOTIFICATIONS_REFRESH_EVENT = 'mangaka:notifications:refresh'

/**
 * Convenience helper: fire a global refresh event. Use after a successful
 * `markRead`/`markAllRead` so the bell badge updates instantly.
 *
 * Safe to call during SSR — guards on `typeof window`.
 */
export function emitNotificationsRefresh(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT))
}

/** Map a BE role code to its dashboard notifications URL. Returns null for
 *  roles that don't have a notifications surface yet (e.g. SUPER_ADMIN). */
export function notificationsPathForRole(role: LoginResDtoOutputUserRole | undefined): string | null {
  if (!role) return null
  if (role === 'MANGAKA') return '/dashboard/mangaka/notifications'
  if (role === 'ASSISTANT') return '/dashboard/assistant/notifications'
  if (role === 'EDITOR') return '/dashboard/editor/notifications'
  if (role === 'BOARD_MEMBER') return '/dashboard/board/notifications'
  return null
}
