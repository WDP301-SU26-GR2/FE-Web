import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  notificationControllerList,
  notificationControllerMarkAllRead,
  notificationControllerMarkRead
} from '~/api/operations/notifications/notifications'
import type { NotificationControllerListParams } from '~/api/model/notifications/notificationControllerListParams'
import type { NotificationControllerListIsRead } from '~/api/model/notifications/notificationControllerListIsRead'
import type { NotificationListResDtoOutputItemsItem } from '~/api/model/notifications'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export const NOTIFICATION_PAGE_SIZE = 12

export type NotificationReadFilter = 'all' | 'unread' | 'read'

function mapReadFilter(filter: NotificationReadFilter): NotificationControllerListIsRead | undefined {
  if (filter === 'unread') return 'false'
  if (filter === 'read') return 'true'
  return undefined
}

type UseAssistantNotificationsResult = {
  items: NotificationListResDtoOutputItemsItem[]
  total: number
  unreadCount: number
  page: number
  perPage: number
  isLoading: boolean
  error: string | null
  filter: NotificationReadFilter
  setFilter: (filter: NotificationReadFilter) => void
  setPage: (page: number) => void
  refresh: () => void
  markRead: (id: string) => Promise<boolean>
  markAllRead: () => Promise<boolean>
  isMutating: boolean
}

/**
 * Paginated notifications for the current user (Assistant).
 *
 * `GET /notifications?isRead=...&limit=...&offset=...`
 *  - `isRead` is BE-typed as `'true' | 'false'`; we translate our tri-state
 *    `NotificationReadFilter` into the right query value (or omit it).
 *  - The response also carries `unreadCount` (filter-independent) which we
 *    surface as the top "X unread" badge.
 *
 * Actions:
 *  - `markRead(id)` → `PATCH /notifications/{id}/read`
 *  - `markAllRead()` → `PATCH /notifications/read-all`
 *
 * Optimistic-ish update: on successful markRead we immediately flip
 * `isRead=true` locally so the row gets the "read" style without a full
 * refetch; markAllRead refreshes from BE to get the new `unreadCount`.
 */
export function useAssistantNotifications(): UseAssistantNotificationsResult {
  const { t } = useTranslation('assistant')
  const [items, setItems] = useState<NotificationListResDtoOutputItemsItem[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPageState] = useState(1)
  const [filter, setFilter] = useState<NotificationReadFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [isMutating, setIsMutating] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(
    async (signal: AbortSignal, targetPage: number, currentFilter: NotificationReadFilter): Promise<void> => {
      const offset = (targetPage - 1) * NOTIFICATION_PAGE_SIZE
      const params: NotificationControllerListParams = {
        limit: NOTIFICATION_PAGE_SIZE,
        offset
      }
      const isRead = mapReadFilter(currentFilter)
      if (isRead !== undefined) params.isRead = isRead

      const res = await notificationControllerList(params, { signal })
      if (signal.aborted) return

      setItems(res.data.items ?? [])
      setTotal(res.data.total)
      setUnreadCount(res.data.unreadCount)
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
        await fetchPage(signal, page, filter)
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        if (isFetchError(err) && (err.status === 403 || err.status === 404)) {
          setItems([])
          setTotal(0)
          setUnreadCount(0)
        } else {
          setError(extractApiErrorMessage(err, t('notifications.error.loadFailed')))
        }
      }
      if (!signal.aborted) {
        setIsLoading(false)
      }
    })()

    return () => abortRef.current?.abort()
  }, [page, filter, reloadToken, fetchPage, t])

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next))
  }, [])

  const refresh = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  const markRead = useCallback(
    async (id: string): Promise<boolean> => {
      setIsMutating(true)
      try {
        await notificationControllerMarkRead({ id })
        // Optimistic flip so the row looks "read" without a refetch.
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, isRead: true } : it)))
        setUnreadCount((c) => (c > 0 ? c - 1 : 0))
        toast.success(t('notifications.success.markedRead'))
        return true
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('notifications.error.markReadFailed')))
        return false
      } finally {
        setIsMutating(false)
      }
    },
    [t]
  )

  const markAllRead = useCallback(async (): Promise<boolean> => {
    setIsMutating(true)
    try {
      await notificationControllerMarkAllRead()
      toast.success(t('notifications.success.markedAllRead'))
      // Refetch so unreadCount + per-item flags reflect the BE truth.
      setReloadToken((n) => n + 1)
      return true
    } catch (err) {
      toast.error(extractApiErrorMessage(err, t('notifications.error.markAllReadFailed')))
      return false
    } finally {
      setIsMutating(false)
    }
  }, [t])

  return {
    items,
    total,
    unreadCount,
    page,
    perPage: NOTIFICATION_PAGE_SIZE,
    isLoading,
    error,
    filter,
    setFilter,
    setPage,
    refresh,
    markRead,
    markAllRead,
    isMutating
  }
}
