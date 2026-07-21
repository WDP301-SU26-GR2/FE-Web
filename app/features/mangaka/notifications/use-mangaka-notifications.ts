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
import { emitNotificationsRefresh } from '~/shared/hooks/use-unread-notifications'

export const NOTIFICATION_PAGE_SIZE = 12

export type NotificationReadFilter = 'all' | 'unread' | 'read'

function mapReadFilter(filter: NotificationReadFilter): NotificationControllerListIsRead | undefined {
  if (filter === 'unread') return 'false'
  if (filter === 'read') return 'true'
  return undefined
}

type UseMangakaNotificationsResult = {
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
 * Paginated notifications for the Mangaka role.
 *
 * Wraps the same `/notifications` endpoints used by other roles (the API is
 * role-agnostic — scope is locked to the current user on the BE side). We
 * mirror `useAssistantNotifications` to keep the UX consistent: tri-state
 * read filter, optimistic per-item flip on mark-read, refetch on mark-all-read.
 *
 * NOTE: BE returns `unreadCount` on every list response (filter-independent),
 * so the value here is always the global unread total. The shared
 * `useUnreadNotifications` hook drives the bell badge by polling the same
 * field; the two stay in sync because both hit the same endpoint family.
 */
export function useMangakaNotifications(): UseMangakaNotificationsResult {
  const { t } = useTranslation('mangaka')
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
        // Nudge the bell badge hook to refresh immediately.
        emitNotificationsRefresh()
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
      emitNotificationsRefresh()
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
