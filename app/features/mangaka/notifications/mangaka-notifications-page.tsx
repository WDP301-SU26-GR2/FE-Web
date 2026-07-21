import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Bell, Check, Filter, RefreshCw } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { FilterChip, Pagination } from '~/shared/components/pagination'
import type { NotificationListResDtoOutputItemsItem } from '~/api/model/notifications'
import type { NotificationListResDtoOutputItemsItemType } from '~/api/model/notifications/notificationListResDtoOutputItemsItemType'
import {
  useMangakaNotifications,
  type NotificationReadFilter
} from './use-mangaka-notifications'

const READ_FILTERS: ReadonlyArray<NotificationReadFilter> = ['all', 'unread', 'read']

/**
 * Resolve a deep-link URL for a Mangaka notification based on its `referenceType`
 * prefix. Mirrors §0.6 of FE-API-Guide-v3 (Notification deep-link).
 *
 * Mangaka-relevant surfaces:
 *   - `PROPOSAL_*` / `SERIES_*`   → series detail
 *   - `NAME_*`                    → series detail (name editor shares the page)
 *   - `CHAPTER_*` / `MANUSCRIPT_*` → publication workbench (chapter view)
 *   - `PAGE_*`                   → publication workbench (pages view)
 *   - `TASK_*`                   → studio (my studio shows assignments)
 *   - `CONTRACT_*` / `PAYMENT_*` / `AMENDMENT_*` → contracts detail
 *   - `DEADLINE_*`               → contracts (where deadline negotiation lives)
 *   - `REVIEW_*` / `INVITE_*`    → assistant directory
 *   - `REVISION_*`               → studio (revision rounds live in workbench)
 *
 * Returns null when the reference can't be navigated to (no id, unknown prefix).
 */
function mangakaNotificationHref(
  item: NotificationListResDtoOutputItemsItem
): { href: string; translationKey: string } | null {
  if (!item.referenceType || !item.referenceId) return null
  const prefix = item.referenceType.split('_')[0] ?? ''
  const id = encodeURIComponent(item.referenceId)

  if (['PROPOSAL', 'SERIES', 'NAME', 'FRANCHISE'].includes(prefix)) {
    return { href: `/dashboard/mangaka/series/${id}`, translationKey: 'notifications.item.openTarget' }
  }
  if (['CHAPTER', 'MANUSCRIPT', 'PAGE'].includes(prefix)) {
    return {
      href: `/dashboard/mangaka/series?chapterId=${id}`,
      translationKey: 'notifications.item.openChapter'
    }
  }
  if (prefix === 'TASK') {
    return { href: `/dashboard/mangaka/studio?taskId=${id}`, translationKey: 'notifications.item.openTask' }
  }
  if (['CONTRACT', 'PAYMENT', 'AMENDMENT'].includes(prefix)) {
    return { href: `/dashboard/mangaka/contracts/${id}`, translationKey: 'notifications.item.openContract' }
  }
  if (prefix === 'DEADLINE') {
    return { href: `/dashboard/mangaka/contracts?deadlineId=${id}`, translationKey: 'notifications.item.openDeadline' }
  }
  if (['REVIEW', 'INVITE', 'ASSIGNMENT'].includes(prefix)) {
    return { href: `/dashboard/mangaka/assistants?referenceId=${id}`, translationKey: 'notifications.item.openAssistant' }
  }
  if (prefix === 'REVISION') {
    return { href: `/dashboard/mangaka/studio?revisionId=${id}`, translationKey: 'notifications.item.openRevision' }
  }
  return null
}

export function MangakaNotificationsPage() {
  const { t } = useTranslation('mangaka')

  const {
    items,
    total,
    unreadCount,
    page,
    perPage,
    isLoading,
    error,
    filter,
    setFilter,
    setPage,
    refresh,
    markRead,
    markAllRead,
    isMutating
  } = useMangakaNotifications()

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <Bell className='h-5 w-5 text-primary' />
            <h1 className='text-2xl font-bold tracking-tight'>{t('notifications.title')}</h1>
            {unreadCount > 0 && (
              <span className='inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary'>
                {t('notifications.summary.unreadCount', { count: unreadCount })}
              </span>
            )}
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>{t('notifications.subtitle')}</p>
        </div>
        <div className='flex items-center gap-2'>
          <a
            href='/dashboard/mangaka'
            className='inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted'
          >
            <ArrowLeft className='h-3.5 w-3.5' />
            {t('notifications.back')}
          </a>
          <button
            type='button'
            disabled={isMutating || unreadCount === 0}
            onClick={() => void markAllRead()}
            className='inline-flex items-center gap-1.5 self-start rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
          >
            <Check className='h-3.5 w-3.5' />
            {t('notifications.actions.markAllRead')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
          <Filter className='h-3.5 w-3.5' />
        </div>
        {READ_FILTERS.map((value) => (
          <FilterChip
            key={value}
            active={filter === value}
            onClick={() => {
              setFilter(value)
              setPage(1)
            }}
            label={t(`notifications.filters.${value}`)}
          />
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div
          role='alert'
          className='flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive'
        >
          <span>{extractApiErrorMessage({ message: error }, t('notifications.error.loadFailed'))}</span>
          <button
            type='button'
            onClick={refresh}
            className='inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-bold hover:bg-destructive/10 cursor-pointer'
          >
            <RefreshCw className='h-3 w-3' />
            {t('notifications.error.retry')}
          </button>
        </div>
      )}

      {/* List */}
      <div className='rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5'>
        {isLoading ? (
          <div className='space-y-3'>
            {Array.from({ length: perPage }).map((_, i) => (
              <NotifSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className='space-y-2'>
              {items.map((notif) => (
                <NotifItem
                  key={notif.id}
                  notif={notif}
                  onMarkRead={(id) => void markRead(id)}
                  isMutating={isMutating}
                />
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              from={from}
              to={to}
              total={total}
              tKeyPrefix='notifications.pagination'
              t={t}
            />
          </>
        )}
      </div>
    </div>
  )
}

const TYPE_TONE: Record<NonNullable<NotificationListResDtoOutputItemsItemType>, string> = {
  SYSTEM: 'bg-muted text-muted-foreground border-border',
  CONTRACT: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
  TASK: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
  DEADLINE: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
  SURVEY: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  BOARD: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
  REVIEW: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
}

function NotifItem({
  notif,
  onMarkRead,
  isMutating
}: {
  notif: NotificationListResDtoOutputItemsItem
  onMarkRead: (id: string) => void
  isMutating: boolean
}) {
  const { t, i18n } = useTranslation('mangaka')
  const locale = i18n.language
  const created = new Date(notif.createdAt)
  const createdLabel = Number.isNaN(created.getTime())
    ? notif.createdAt
    : created.toLocaleString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
  const toneClass = notif.type ? TYPE_TONE[notif.type] : 'bg-muted text-muted-foreground border-border'
  const deepLink = mangakaNotificationHref(notif)

  return (
    <article
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3 shadow-sm transition-colors',
        !notif.isRead && 'border-primary/30 bg-primary/5'
      )}
    >
      <div
        className={cn(
          'mt-0.5 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
          toneClass
        )}
      >
        {notif.type ? t(`notifications.type.${notif.type}`) : '—'}
      </div>
      <div className='min-w-0 flex-1 space-y-1'>
        <p
          className={cn(
            'text-sm leading-snug',
            notif.isRead ? 'text-muted-foreground' : 'font-semibold text-foreground'
          )}
        >
          {notif.content || t('notifications.item.noContent')}
        </p>
        <p className='text-[10px] text-muted-foreground'>
          {createdLabel}
          {notif.referenceType && notif.referenceId && (
            <>
              {' · '}
              {t('notifications.item.reference', {
                type: notif.referenceType,
                id: notif.referenceId.slice(0, 8)
              })}
            </>
          )}
        </p>
        {deepLink && (
          <Link
            to={deepLink.href}
            className='mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline'
          >
            {t(deepLink.translationKey)}
          </Link>
        )}
      </div>
      {!notif.isRead && (
        <button
          type='button'
          disabled={isMutating}
          onClick={() => onMarkRead(notif.id)}
          className='inline-flex shrink-0 items-center gap-1 self-start rounded-md border border-border bg-card px-2 py-1 text-[10px] font-bold text-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
        >
          <Check className='h-3 w-3' />
          {t('notifications.actions.markRead')}
        </button>
      )}
    </article>
  )
}

function NotifSkeleton() {
  return (
    <div className='flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3 shadow-sm'>
      <div className='h-4 w-16 animate-pulse rounded-full bg-muted' />
      <div className='flex-1 space-y-1.5'>
        <div className='h-3 w-3/4 animate-pulse rounded bg-muted' />
        <div className='h-2.5 w-1/3 animate-pulse rounded bg-muted' />
      </div>
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex flex-col items-center gap-3 py-12 text-center'>
      <Bell className='h-8 w-8 text-muted-foreground/40' />
      <p className='text-sm font-semibold text-foreground'>{t('notifications.empty.title')}</p>
      <p className='max-w-sm text-xs text-muted-foreground'>{t('notifications.empty.description')}</p>
    </div>
  )
}
