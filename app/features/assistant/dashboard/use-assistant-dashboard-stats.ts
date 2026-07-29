import { useEffect, useState } from 'react'

import { assistantDashboardControllerAssistant } from '~/api/operations/dashboard/dashboard'
import { taskControllerListTasks } from '~/api/operations/task/task'
import { isFetchError } from '~/api/mutator/custom-fetch'

export type AssistantDashboardStats = {
  pendingTasksCount: number
  inProgressTasksCount: number
  upcomingDeadlinesCount: number
  ratingAvg: number | null
  ratingCount: number | null
  unreadNotificationsCount: number
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

type DashboardHookState = {
  stats: AssistantDashboardStats | null
  isLoading: boolean
  error: string | null
}

/**
 * Uses the purpose-built Assistant dashboard endpoint for status, reputation
 * and unread counts. A single task list request is kept only for the
 * date-based "due in 7 days" KPI, because that value is not part of the
 * dashboard response.
 */
export function useAssistantDashboardStats(): DashboardHookState {
  const [stats, setStats] = useState<AssistantDashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [dashboardResponse, taskListResponse] = await Promise.all([
          assistantDashboardControllerAssistant({ signal: controller.signal }),
          taskControllerListTasks({ limit: 100, offset: 0 }, { signal: controller.signal })
        ])
        if (controller.signal.aborted) return

        const dashboard = dashboardResponse.data
        const tasksByStatus = dashboard?.tasks?.byStatus ?? {}
        const now = Date.now()
        const cutoff = now + SEVEN_DAYS_MS
        const upcomingDeadlinesCount = (taskListResponse.data?.items ?? []).filter((task) => {
          if (!task.deadline || !['ASSIGNED', 'IN_PROGRESS', 'REVISION_REQUESTED'].includes(task.status)) return false
          const timestamp = Date.parse(task.deadline)
          return !Number.isNaN(timestamp) && timestamp >= now && timestamp <= cutoff
        }).length

        setStats({
          pendingTasksCount: tasksByStatus.ASSIGNED ?? 0,
          inProgressTasksCount: tasksByStatus.IN_PROGRESS ?? 0,
          upcomingDeadlinesCount,
          ratingAvg: typeof dashboard?.reputation?.ratingAvg === 'number' ? dashboard.reputation.ratingAvg : null,
          ratingCount: typeof dashboard?.reputation?.ratingCount === 'number' ? dashboard.reputation.ratingCount : null,
          unreadNotificationsCount: dashboard?.unreadNotifications ?? 0
        })
      } catch (err) {
        if (controller.signal.aborted) return
        setStats(null)
        setError(isFetchError(err) ? err.message : 'Unable to load assistant dashboard')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [])

  return { stats, isLoading, error }
}
