import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Bell, ChevronRight, Loader2 } from 'lucide-react'

import {
  notificationControllerList,
  notificationControllerMarkAllRead,
  notificationControllerMarkRead
} from '~/api/operations/notifications/notifications'
import type { NotificationListResDtoOutputItemsItem } from '~/api/model/notifications'
import { useAuth } from '~/features/auth/context/auth-context'
import { cn } from '~/shared/lib/cn'
import {
  emitNotificationsRefresh,
  notificationsPathForRole,
  useUnreadNotifications
} from '~/shared/hooks/use-unread-notifications'

const PREVIEW_LIMIT = 6

function notificationHref(item: NotificationListResDtoOutputItemsItem, role: string | undefined): string | null {
  if (!item.referenceType || !item.referenceId) return null

  const id = encodeURIComponent(item.referenceId)
  const prefix = item.referenceType.split('_')[0] ?? ''

  if (role === 'MANGAKA') {
    if (['PROPOSAL', 'SERIES', 'NAME', 'FRANCHISE'].includes(prefix)) return `/dashboard/mangaka/series/${id}`
    if (['CHAPTER', 'MANUSCRIPT', 'PAGE'].includes(prefix)) return `/dashboard/mangaka/series?chapterId=${id}`
    if (prefix === 'TASK') return `/dashboard/mangaka/studio?taskId=${id}`
    if (['CONTRACT', 'PAYMENT', 'AMENDMENT'].includes(prefix)) return `/dashboard/mangaka/contracts/${id}`
    if (prefix === 'DEADLINE') return `/dashboard/mangaka/contracts?deadlineId=${id}`
    if (['REVIEW', 'INVITE', 'ASSIGNMENT'].includes(prefix)) return `/dashboard/mangaka/assistants?referenceId=${id}`
    if (prefix === 'REVISION') return `/dashboard/mangaka/studio?revisionId=${id}`
  }

  if (role === 'ASSISTANT' && prefix === 'TASK') return `/dashboard/assistant/tasks?taskId=${id}`

  return null
}

/**
 * Header notification inbox. The bell opens a compact list of unread items;
 * the role-specific notifications page remains available through "View all".
 */
export function NotificationBell() {
  const { t, i18n } = useTranslation('common')
  const { session } = useAuth()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<NotificationListResDtoOutputItemsItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const role = session?.user?.role
  const target = notificationsPathForRole(role)
  const { unreadCount, refresh } = useUnreadNotifications({
    enabled: Boolean(session),
    pollIntervalMs: 25_000
  })
  const hasUnread = unreadCount > 0
  const label = hasUnread ? t('layout.notificationsWithCount', { count: unreadCount }) : t('layout.notifications')

  const loadUnread = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await notificationControllerList({ isRead: 'false', limit: PREVIEW_LIMIT, offset: 0 })
      setItems(res.data.items)
    } catch {
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    void loadUnread()
  }, [isOpen, loadUnread])

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const openItem = async (item: NotificationListResDtoOutputItemsItem) => {
    if (!item.isRead) {
      try {
        await notificationControllerMarkRead({ id: item.id })
        setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))
        refresh()
        emitNotificationsRefresh()
      } catch {
        // Navigation should still work if marking read fails.
      }
    }

    setIsOpen(false)
    navigate(notificationHref(item, role) ?? target ?? '/')
  }

  const markAllRead = async () => {
    setIsMarkingAll(true)
    try {
      await notificationControllerMarkAllRead()
      setItems([])
      refresh()
      emitNotificationsRefresh()
    } catch {
      // Keep the inbox open and preserve its items if the update cannot be saved.
    } finally {
      setIsMarkingAll(false)
    }
  }

  return (
    <div ref={panelRef} className='relative'>
      <button
        type='button'
        onClick={() => setIsOpen((open) => !open)}
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup='dialog'
        title={label}
        className='relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
      >
        <Bell className='h-5 w-5' />
        {hasUnread ? (
          <span
            aria-hidden='true'
            className='absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-card'
          />
        ) : null}
      </button>

      {isOpen && (
        <section
          role='dialog'
          aria-label={t('notificationMenu.label')}
          className='absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl'
        >
          <header className='flex items-center justify-between border-b border-border px-4 py-3'>
            <div>
              <h2 className='text-sm font-bold'>{t('notificationMenu.title')}</h2>
              <p className='text-xs text-muted-foreground'>
                {t('notificationMenu.unreadCount', { count: unreadCount })}
              </p>
            </div>
            <button
              type='button'
              disabled={!hasUnread || isMarkingAll}
              onClick={() => void markAllRead()}
              className='text-xs font-semibold text-primary transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isMarkingAll ? <Loader2 className='h-4 w-4 animate-spin' /> : t('notificationMenu.markAllRead')}
            </button>
          </header>

          <div className='max-h-[min(28rem,calc(100vh-10rem))] overflow-y-auto p-2'>
            {isLoading ? (
              <div className='flex justify-center py-10'>
                <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
              </div>
            ) : items.length === 0 ? (
              <div className='px-4 py-10 text-center text-sm text-muted-foreground'>{t('notificationMenu.empty')}</div>
            ) : (
              items.map((item) => {
                const createdAt = new Date(item.createdAt)
                const time = Number.isNaN(createdAt.getTime())
                  ? item.createdAt
                  : createdAt.toLocaleString(i18n.language, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })

                return (
                  <button
                    key={item.id}
                    type='button'
                    onClick={() => void openItem(item)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted',
                      !item.isRead && 'bg-primary/5'
                    )}
                  >
                    <span
                      className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary', item.isRead && 'opacity-0')}
                      aria-hidden='true'
                    />
                    <span className='min-w-0 flex-1'>
                      <span
                        className={cn('block text-sm leading-snug', !item.isRead && 'font-semibold text-foreground')}
                      >
                        {item.content || t('notificationMenu.noContent')}
                      </span>
                      <span className='mt-1 block text-xs text-muted-foreground'>{time}</span>
                    </span>
                    <ChevronRight className='mt-1 h-4 w-4 shrink-0 text-muted-foreground' aria-hidden='true' />
                  </button>
                )
              })
            )}
          </div>

          {target && (
            <button
              type='button'
              onClick={() => {
                setIsOpen(false)
                navigate(target)
              }}
              className='flex w-full items-center justify-center gap-1.5 border-t border-border px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-muted hover:text-foreground'
            >
              {t('notificationMenu.viewAll')}
              <ChevronRight className='h-4 w-4' />
            </button>
          )}
        </section>
      )}
    </div>
  )
}
