import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  taskControllerListTasks,
  taskControllerApproveTask,
  taskControllerRequestRevision,
  taskControllerCancelTask
} from '~/api/operations/task/task'
import type { TaskControllerListTasksParams } from '~/api/model/task/taskControllerListTasksParams'
import type { TaskControllerListTasksStatus } from '~/api/model/task/taskControllerListTasksStatus'
import type { TaskListResDtoOutputItemsItem } from '~/api/model/task/taskListResDtoOutputItemsItem'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export interface UseMangakaTasksOptions {
  /** Filter tasks by series. Can be combined freely with other filters. */
  seriesId?: string
  /** Filter tasks by chapter. Requires seriesId if provided. */
  chapterId?: string
  /** Filter tasks by page. Requires chapterId if provided. */
  pageId?: string
  /** Filter tasks by assistant (assistantId). */
  assistantId?: string
  /** Filter by task status. */
  status?: TaskControllerListTasksStatus
  /** Current page (1-indexed). Default: 1 */
  page?: number
  /** Items per page. Default: 4 */
  limit?: number
}

export interface UseMangakaTasksResult {
  tasks: TaskListResDtoOutputItemsItem[]
  total: number
  page: number
  totalPages: number
  isLoading: boolean
  error: string | null
  reloadToken: number
  refresh: () => void
  approveTask: (taskId: string) => Promise<{ success: boolean; error?: string }>
  requestRevision: (taskId: string, reviewerNote: string) => Promise<{ success: boolean; error?: string }>
  cancelTask: (taskId: string, reason?: string) => Promise<{ success: boolean; error?: string }>
}

/**
 * Mangaka task list hook — per FE-API-Guide-v3.md §6 (2026-07-21 update).
 *
 * **Key change:** Mangaka NO LONGER needs to pass `pageId`. `GET /tasks` without
 * filters returns ALL tasks belonging to every series the Mangaka owns.
 * Filters can be combined freely: `?seriesId=` · `?chapterId=` · `?pageId=` · `?status=`.
 *
 * - No filter → all tasks across all series (default view)
 * - `seriesId` → tasks for one series
 * - `seriesId + chapterId` → tasks for one chapter
 * - `seriesId + chapterId + pageId` → tasks for one page (previous cascade behavior)
 *
 * The cascade (series → chapter → page) is now OPTIONAL — users can browse all
 * tasks directly or narrow down using the filter dropdowns.
 */
export function useMangakaTasks(options: UseMangakaTasksOptions): UseMangakaTasksResult {
  const { t } = useTranslation('mangaka')
  const { seriesId, chapterId, pageId, assistantId, status, page = 1, limit = 4 } = options

  const [tasks, setTasks] = useState<TaskListResDtoOutputItemsItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    Promise.resolve().then(() => {
      setIsLoading(true)
      setError(null)
    })
    void (async () => {
      try {
        // Per FE-API-Guide-v3.md §6: all filters are optional and combinable.
        // Omitting pageId/chapterId/seriesId returns all tasks for this Mangaka.
        const offset = (page - 1) * limit
        const params: TaskControllerListTasksParams = {
          limit,
          offset
        }
        if (seriesId) params.seriesId = seriesId
        if (chapterId) params.chapterId = chapterId
        if (pageId) params.pageId = pageId
        if (assistantId) params.assistantId = assistantId
        if (status) params.status = status

        const res = await taskControllerListTasks(params, { signal: ctrl.signal })
        if (ctrl.signal.aborted) return
        const data = res.data
        setTasks(data?.items ?? [])
        setTotal(data?.total ?? 0)
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return
        if (ctrl.signal.aborted) return
        setError(extractApiErrorMessage(err, t('tasks.errors.loadFailed')))
        setTasks([])
        setTotal(0)
      } finally {
        if (!ctrl.signal.aborted) setIsLoading(false)
      }
    })()

    return () => ctrl.abort()
  }, [seriesId, chapterId, pageId, assistantId, status, page, limit, reloadToken, t])

  const totalPages = Math.ceil(total / limit)

  const refresh = useCallback(() => setReloadToken((n) => n + 1), [])

  const approveTask = useCallback(
    async (taskId: string) => {
      try {
        await taskControllerApproveTask({ id: taskId })
        setReloadToken((n) => n + 1)
        return { success: true }
      } catch (err) {
        return { success: false, error: extractApiErrorMessage(err, t('tasks.errors.approveFailed')) }
      }
    },
    [t]
  )

  const requestRevision = useCallback(
    async (taskId: string, reviewerNote: string) => {
      try {
        await taskControllerRequestRevision({ id: taskId }, { reviewerNote })
        setReloadToken((n) => n + 1)
        return { success: true }
      } catch (err) {
        return { success: false, error: extractApiErrorMessage(err, t('tasks.errors.revisionFailed')) }
      }
    },
    [t]
  )

  const cancelTask = useCallback(
    async (taskId: string, reason?: string) => {
      try {
        await taskControllerCancelTask({ id: taskId }, { reason })
        setReloadToken((n) => n + 1)
        return { success: true }
      } catch (err) {
        return { success: false, error: extractApiErrorMessage(err, t('tasks.errors.cancelFailed')) }
      }
    },
    [t]
  )

  return { tasks, total, page, totalPages, isLoading, error, reloadToken, refresh, approveTask, requestRevision, cancelTask }
}
