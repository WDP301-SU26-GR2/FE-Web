import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  taskControllerListTasks,
  taskControllerApproveTask,
  taskControllerRequestRevision,
  taskControllerCancelTask
} from '~/api/operations/task/task'
import type { TaskControllerListTasksParams } from '~/api/model/task/taskControllerListTasksParams'
import type { TaskListResDtoOutputItemsItem } from '~/api/model/task/taskListResDtoOutputItemsItem'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export interface UseMangakaTasksOptions {
  assistantId?: string
  status?: string
}

export interface UseMangakaTasksResult {
  tasks: TaskListResDtoOutputItemsItem[]
  total: number
  page: number
  perPage: number
  isLoading: boolean
  error: string | null
  filters: {
    assistantId?: string
    status?: string
  }
  setPage: (page: number) => void
  setFilters: (filters: UseMangakaTasksOptions) => void
  refresh: () => void
  approveTask: (taskId: string) => Promise<{ success: boolean; error?: string }>
  requestRevision: (taskId: string, reviewerNote: string) => Promise<{ success: boolean; error?: string }>
  cancelTask: (taskId: string, reason?: string) => Promise<{ success: boolean; error?: string }>
}

const DEFAULT_PER_PAGE = 20

export function useMangakaTasks(options: UseMangakaTasksOptions = {}): UseMangakaTasksResult {
  const { t } = useTranslation('mangaka')
  const [tasks, setTasks] = useState<TaskListResDtoOutputItemsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<UseMangakaTasksOptions>(options)

  const fetchTasks = useCallback(
    async (currentFilters: UseMangakaTasksOptions, currentPage: number) => {
      setIsLoading(true)
      setError(null)
      try {
        const params: TaskControllerListTasksParams = {
          limit: DEFAULT_PER_PAGE,
          offset: (currentPage - 1) * DEFAULT_PER_PAGE
        }
        if (currentFilters.assistantId) params.assistantId = currentFilters.assistantId
        if (currentFilters.status) params.status = currentFilters.status as TaskControllerListTasksParams['status']

        const res = await taskControllerListTasks(params)
        const data = res.data as { items: TaskListResDtoOutputItemsItem[]; total: number } | null
        if (data) {
          setTasks(data.items)
          setTotal(data.total)
        } else {
          setTasks([])
          setTotal(0)
        }
      } catch (err) {
        setError(extractApiErrorMessage(err, t('tasks.errors.loadFailed')))
        setTasks([])
        setTotal(0)
      } finally {
        setIsLoading(false)
      }
    },
    [t]
  )

  // Initial load and refresh
  const refresh = useCallback(() => {
    void fetchTasks(filters, page)
  }, [fetchTasks, filters, page])

  // Re-fetch when page or filters change
  const handleSetPage = useCallback(
    (newPage: number) => {
      setPage(newPage)
      void fetchTasks(filters, newPage)
    },
    [fetchTasks, filters]
  )

  const handleSetFilters = useCallback(
    (newFilters: UseMangakaTasksOptions) => {
      setFiltersState(newFilters)
      setPage(1)
      void fetchTasks(newFilters, 1)
    },
    [fetchTasks]
  )

  useEffect(() => {
    void Promise.resolve().then(() => fetchTasks(options, 1))
    // `options` are initial-only; later changes go through handleSetFilters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTasks])

  const approveTask = useCallback(
    async (taskId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await taskControllerApproveTask({ id: taskId })
        void refresh()
        return { success: true }
      } catch (err) {
        return { success: false, error: extractApiErrorMessage(err, t('tasks.errors.approveFailed')) }
      }
    },
    [refresh, t]
  )

  const requestRevision = useCallback(
    async (taskId: string, reviewerNote: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await taskControllerRequestRevision({ id: taskId }, { reviewerNote })
        void refresh()
        return { success: true }
      } catch (err) {
        return { success: false, error: extractApiErrorMessage(err, t('tasks.errors.revisionFailed')) }
      }
    },
    [refresh, t]
  )

  const cancelTask = useCallback(
    async (taskId: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await taskControllerCancelTask({ id: taskId }, { reason })
        void refresh()
        return { success: true }
      } catch (err) {
        return { success: false, error: extractApiErrorMessage(err, t('tasks.errors.cancelFailed')) }
      }
    },
    [refresh, t]
  )

  return {
    tasks,
    total,
    page,
    perPage: DEFAULT_PER_PAGE,
    isLoading,
    error,
    filters,
    setPage: handleSetPage,
    setFilters: handleSetFilters,
    refresh,
    approveTask,
    requestRevision,
    cancelTask
  }
}
