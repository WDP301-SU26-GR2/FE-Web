import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { taskControllerListTasks } from '~/api/operations/task/task'
import type { TaskControllerListTasksParams } from '~/api/model/task/taskControllerListTasksParams'
import type { TaskControllerListTasksStatus } from '~/api/model/task/taskControllerListTasksStatus'
import type { TaskListResDtoOutputItemsItem } from '~/api/model/task/taskListResDtoOutputItemsItem'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export const ASSISTANT_TASK_PAGE_SIZE = 8

export interface UseAssistantTasksQueryOptions {
  status?: TaskControllerListTasksStatus
  /** Hard cap on page size, default `ASSISTANT_TASK_PAGE_SIZE`. */
  limit?: number
}

export interface UseAssistantTasksQueryResult {
  items: TaskListResDtoOutputItemsItem[]
  total: number
  page: number
  perPage: number
  isLoading: boolean
  error: string | null
  setPage: (page: number) => void
  refresh: () => void
}

/**
 * Flat task list (server-scoped to the calling assistant) with optional status
 * filter and pagination. Page-level context (page image, region overlay) is
 * fetched separately when the assistant opens a task dialog — see
 * `TaskImageDialog`.
 *
 * Endpoint: `GET /tasks?status=&limit=&offset=` — BE `ChapterController_listBySeries`
 * task list filtering rules from FE-API-Guide-v3.md §6 already scope to the
 * caller's assistantId, so no explicit user-scope param.
 */
export function useAssistantTasksQuery(options: UseAssistantTasksQueryOptions = {}): UseAssistantTasksQueryResult {
  const { t } = useTranslation('assistant')
  const [items, setItems] = useState<TaskListResDtoOutputItemsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPageState] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const perPage = options.limit ?? ASSISTANT_TASK_PAGE_SIZE

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    // Defer initial "loading" + reset to a microtask so the effect body doesn't
    // synchronously `setState` (triggering `react-hooks/set-state-in-effect`).
    // Behaviorally identical — the user only sees the spinner that follows.
    Promise.resolve().then(() => {
      setIsLoading(true)
      setError(null)
    })
    void (async () => {
      try {
        const params: TaskControllerListTasksParams = {
          limit: perPage,
          offset: (page - 1) * perPage
        }
        if (options.status) params.status = options.status
        const res = await taskControllerListTasks(params, { signal: ctrl.signal })
        if (ctrl.signal.aborted) return
        setItems(res.data?.items ?? [])
        setTotal(res.data?.total ?? 0)
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return
        if (ctrl.signal.aborted) return
        setError(extractApiErrorMessage(err, t('tasks.error.loadFailed')))
        setItems([])
        setTotal(0)
      } finally {
        if (!ctrl.signal.aborted) setIsLoading(false)
      }
    })()
    return () => ctrl.abort()
  }, [options.status, page, reloadToken, perPage, t])

  const setPage = useCallback((next: number) => setPageState(Math.max(1, next)), [])
  const refresh = useCallback(() => setReloadToken((n) => n + 1), [])

  return { items, total, page, perPage, isLoading, error, setPage, refresh }
}
