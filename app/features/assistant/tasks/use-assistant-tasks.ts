import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { taskControllerListTasks, taskControllerStartTask, taskControllerSubmitTask } from '~/api/operations/task/task'
import type { TaskControllerListTasksParams } from '~/api/model/task/taskControllerListTasksParams'
import type { TaskControllerListTasksStatus } from '~/api/model/task/taskControllerListTasksStatus'
import type { TaskListResDtoOutputItemsItem } from '~/api/model/task'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export const TASK_PAGE_SIZE = 8

export type TaskFilterStatus = TaskControllerListTasksStatus | undefined

type UseAssistantTasksResult = {
  items: TaskListResDtoOutputItemsItem[]
  total: number
  page: number
  perPage: number
  isLoading: boolean
  error: string | null
  status: TaskFilterStatus
  setStatus: (status: TaskFilterStatus) => void
  setPage: (page: number) => void
  refresh: () => void
  startTask: (taskId: string) => Promise<boolean>
  submitTask: (taskId: string, file: string) => Promise<boolean>
  isMutating: boolean
}

/**
 * Paginated list of tasks assigned to the current Assistant.
 *
 * Endpoint: `GET /tasks?assistantId=<me>&status=...&limit=...&offset=...`
 * Per FE-API-Guide-v3.md §6 the BE scopes `tasks` to the caller's assistantId,
 * so we don't pass it explicitly — we just send the status filter and paging.
 *
 * Actions:
 *  - `startTask(id)` → POST /tasks/{id}/start  (ASSIGNED → IN_PROGRESS)
 *  - `submitTask(id, file)` → POST /tasks/{id}/submit (IN_PROGRESS → SUBMITTED)
 *
 * After a successful mutation we re-fetch the current page so the card updates
 * without a full reload. Errors are surfaced via Sonner + the localised
 * `error.startFailed` / `error.submitFailed` strings.
 */
export function useAssistantTasks(): UseAssistantTasksResult {
  const { t } = useTranslation('assistant')
  const [items, setItems] = useState<TaskListResDtoOutputItemsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPageState] = useState(1)
  const [status, setStatus] = useState<TaskFilterStatus>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [isMutating, setIsMutating] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(
    async (signal: AbortSignal, targetPage: number, currentStatus: TaskFilterStatus): Promise<void> => {
      const offset = (targetPage - 1) * TASK_PAGE_SIZE
      const params: TaskControllerListTasksParams = {
        limit: TASK_PAGE_SIZE,
        offset
      }
      if (currentStatus) params.status = currentStatus

      const res = await taskControllerListTasks(params, { signal })
      if (signal.aborted) return

      const data = res.data
      setItems(data.items ?? [])
      setTotal(data.total)
    },
    []
  )

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)
    ;(async () => {
      try {
        await fetchPage(signal, page, status)
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        if (isFetchError(err) && (err.status === 403 || err.status === 404)) {
          setItems([])
          setTotal(0)
        } else {
          setError(extractApiErrorMessage(err, t('tasks.error.loadFailed')))
        }
      }
      if (!signal.aborted) {
        setIsLoading(false)
      }
    })()

    return () => abortRef.current?.abort()
  }, [page, status, reloadToken, fetchPage, t])

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next))
  }, [])

  const refresh = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  const startTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      setIsMutating(true)
      try {
        await taskControllerStartTask({ id: taskId })
        setReloadToken((n) => n + 1)
        return true
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('tasks.error.startFailed')))
        return false
      } finally {
        setIsMutating(false)
      }
    },
    [t]
  )

  const submitTask = useCallback(
    async (taskId: string, file: string): Promise<boolean> => {
      const trimmed = file.trim()
      if (!trimmed) {
        toast.error(t('tasks.error.noFileToSubmit'))
        return false
      }
      setIsMutating(true)
      try {
        await taskControllerSubmitTask({ id: taskId }, { file: trimmed })
        toast.success(t('tasks.error.submitSuccess'))
        setReloadToken((n) => n + 1)
        return true
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('tasks.error.submitFailed')))
        return false
      } finally {
        setIsMutating(false)
      }
    },
    [t]
  )

  return {
    items,
    total,
    page,
    perPage: TASK_PAGE_SIZE,
    isLoading,
    error,
    status,
    setStatus,
    setPage,
    refresh,
    startTask,
    submitTask,
    isMutating
  }
}
