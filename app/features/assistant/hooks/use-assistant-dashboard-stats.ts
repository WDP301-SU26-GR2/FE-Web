import { useEffect, useState } from 'react'

import { notificationControllerList } from '~/api/operations/notifications/notifications'
import { taskControllerListTasks } from '~/api/operations/task/task'
import { studioControllerListAssignments, studioControllerListInvites } from '~/api/operations/studio/studio'
import { usersControllerGetMyAssistantProfile } from '~/api/operations/users/users'
import { isFetchError } from '~/api/mutator/custom-fetch'

export type AssistantDashboardStats = {
  /** Tasks in ASSIGNED state — waiting for the assistant to start. */
  pendingTasksCount: number
  /** Tasks currently IN_PROGRESS. */
  inProgressTasksCount: number
  /** Tasks (ASSIGNED/IN_PROGRESS/SUBMITTED/REVISION_REQUESTED) whose deadline is
   *  in the next 7 days. */
  upcomingDeadlinesCount: number
  /** Average rating + count from the assistant's own profile (lazy 1:1, 404 OK). */
  ratingAvg: number | null
  ratingCount: number | null
  /** Total unread notifications — used in the bell badge. */
  unreadNotificationsCount: number
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

type DashboardHookState = {
  stats: AssistantDashboardStats | null
  isLoading: boolean
  error: string | null
}

/**
 * Computes the four KPI numbers on the Assistant dashboard init page.
 *
 * Strategy: fire independent fetches in parallel — we don't want one slow
 * endpoint to block the whole dashboard. Each call's error is swallowed
 * (counted as 0 / unknown) so the page still renders gracefully on partial
 * outages. Promise.allSettled lets each call keep its own error scope.
 *
 * Endpoints touched:
 *  - `GET /tasks?status=ASSIGNED&limit=1`     → pendingTasksCount (.total)
 *  - `GET /tasks?status=IN_PROGRESS&limit=1`  → inProgressTasksCount (.total)
 *  - `GET /tasks?status=ASSIGNED&limit=100`   → upcomingDeadlinesCount (filter client-side)
 *  - `GET /me/assistant-profile`              → ratingAvg / ratingCount
 *  - `GET /notifications?limit=1`             → unreadNotificationsCount
 *  - `GET /studio-assignments?limit=1`        → LRU cache warm for /dashboard/studio
 *  - `GET /collaboration-invites?limit=1`     → LRU cache warm for /dashboard/invites
 *
 * 403/404 on the profile endpoint is expected (assistant hasn't built a
 * profile yet) → we render the rating card with "—".
 */
export function useAssistantDashboardStats(): DashboardHookState {
  const [stats, setStats] = useState<AssistantDashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [pendingRes, inProgressRes, upcomingRes, profileRes, notifRes] = await Promise.allSettled([
          taskControllerListTasks({ status: 'ASSIGNED', limit: 1, offset: 0 }, { signal }),
          taskControllerListTasks({ status: 'IN_PROGRESS', limit: 1, offset: 0 }, { signal }),
          taskControllerListTasks({ status: 'ASSIGNED', limit: 100, offset: 0 }, { signal }),
          usersControllerGetMyAssistantProfile({ signal }),
          notificationControllerList({ limit: 1, offset: 0 }, { signal }),
          // Warm caches for downstream pages — results intentionally unused.
          studioControllerListAssignments({ limit: 1, offset: 0 }, { signal }),
          studioControllerListInvites({ limit: 1, offset: 0 }, { signal })
        ])

        if (signal.aborted) return

        const safeTotal = (r: PromiseSettledResult<unknown>): number => {
          if (r.status !== 'fulfilled') return 0
          const data = (r.value as { data?: { total?: number } }).data
          return typeof data?.total === 'number' ? data.total : 0
        }

        const safeUnread = (r: PromiseSettledResult<unknown>): number => {
          if (r.status !== 'fulfilled') return 0
          const data = (r.value as { data?: { unreadCount?: number } }).data
          return typeof data?.unreadCount === 'number' ? data.unreadCount : 0
        }

        const upcomingTasks =
          upcomingRes.status === 'fulfilled'
            ? ((upcomingRes.value as { data: { items: Array<{ deadline: string | null }> } }).data.items ?? [])
            : []
        const now = Date.now()
        const cutoff = now + SEVEN_DAYS_MS
        const upcomingDeadlinesCount = upcomingTasks.filter((t) => {
          if (!t.deadline) return false
          const ts = new Date(t.deadline).getTime()
          if (Number.isNaN(ts)) return false
          return ts <= cutoff
        }).length

        let ratingAvg: number | null = null
        let ratingCount: number | null = null
        if (profileRes.status === 'fulfilled') {
          const profile = (profileRes.value as { data: { ratingAvg: number; ratingCount: number } }).data
          ratingAvg = profile.ratingAvg
          ratingCount = profile.ratingCount
        }

        setStats({
          pendingTasksCount: safeTotal(pendingRes),
          inProgressTasksCount: safeTotal(inProgressRes),
          upcomingDeadlinesCount,
          ratingAvg,
          ratingCount,
          unreadNotificationsCount: safeUnread(notifRes)
        })
      } catch (err) {
        if (signal.aborted) return
        if (isFetchError(err)) {
          setError(err.message)
        } else {
          setStats({
            pendingTasksCount: 0,
            inProgressTasksCount: 0,
            upcomingDeadlinesCount: 0,
            ratingAvg: null,
            ratingCount: null,
            unreadNotificationsCount: 0
          })
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
        }
      }
    })()

    return () => controller.abort()
  }, [])

  return { stats, isLoading, error }
}
