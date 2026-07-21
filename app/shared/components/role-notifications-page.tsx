import { useEffect } from 'react'
import { ArrowLeft, ArrowUpRight, Bell, Check, Filter } from 'lucide-react'
import { Link, useFetcher, useNavigate, useNavigation, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { NotificationListResDtoOutput, NotificationListResDtoOutputItemsItem } from '~/api/model/notifications'
import type { NotificationListResDtoOutputItemsItemType } from '~/api/model/notifications/notificationListResDtoOutputItemsItemType'
import { cn } from '~/shared/lib/cn'
import { FilterChip, Pagination } from './pagination'

export type NotificationRole = 'MANGAKA' | 'EDITOR' | 'BOARD_MEMBER' | 'SUPER_ADMIN'

type NotificationActionResult = {
  ok: boolean
  intent: string
  message?: string
}

const PAGE_SIZE = 12
const READ_FILTERS = ['all', 'unread', 'read'] as const

const TYPE_TONE: Record<NonNullable<NotificationListResDtoOutputItemsItemType>, string> = {
  SYSTEM: 'border-border bg-muted text-muted-foreground',
  CONTRACT: 'border-violet-500/20 bg-violet-500/10 text-violet-700',
  TASK: 'border-sky-500/20 bg-sky-500/10 text-sky-700',
  DEADLINE: 'border-rose-500/20 bg-rose-500/10 text-rose-700',
  SURVEY: 'border-amber-500/20 bg-amber-500/10 text-amber-700',
  BOARD: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-700',
  REVIEW: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
}

export function RoleNotificationsPage({
  data,
  role,
  backHref
}: {
  data: NotificationListResDtoOutput
  role: NotificationRole
  backHref: string
}) {
  const { t } = useTranslation('common')
  const fetcher = useFetcher<NotificationActionResult>()
  const navigation = useNavigation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const filter = readFilter(searchParams.get('filter'))
  const page = positiveInteger(searchParams.get('page'))
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const from = data.total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const to = Math.min(currentPage * PAGE_SIZE, data.total)
  const isMutating = fetcher.state !== 'idle'
  const isLoading = navigation.state === 'loading'

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return
    if (fetcher.data.ok) {
      toast.success(
        fetcher.data.intent === 'markAllRead'
          ? t('notificationsPage.success.markedAllRead')
          : t('notificationsPage.success.markedRead')
      )
      window.dispatchEvent(new Event('notifications:changed'))
    } else {
      toast.error(fetcher.data.message || t('notificationsPage.error.updateFailed'))
    }
  }, [fetcher.data, fetcher.state, t])

  const updateLocation = (nextFilter: (typeof READ_FILTERS)[number], nextPage: number) => {
    const params = new URLSearchParams(searchParams)
    if (nextFilter === 'all') params.delete('filter')
    else params.set('filter', nextFilter)
    if (nextPage <= 1) params.delete('page')
    else params.set('page', String(nextPage))
    navigate(`?${params.toString()}`)
  }

  return (
    <div className='space-y-6 pb-12'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <Bell className='size-5 text-primary' />
            <h1 className='text-2xl font-bold tracking-tight'>{t('notificationsPage.title')}</h1>
            {data.unreadCount > 0 && (
              <span className='inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary'>
                {t('notificationsPage.summary.unreadCount', { count: data.unreadCount })}
              </span>
            )}
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>{t('notificationsPage.subtitle')}</p>
        </div>
        <div className='flex items-center gap-2'>
          <Link
            to={backHref}
            className='inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-muted'
          >
            <ArrowLeft className='size-3.5' />
            {t('notificationsPage.back')}
          </Link>
          <fetcher.Form method='post'>
            <button
              name='intent'
              value='markAllRead'
              disabled={isMutating || data.unreadCount === 0}
              className='inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <Check className='size-3.5' />
              {t('notificationsPage.actions.markAllRead')}
            </button>
          </fetcher.Form>
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm'>
        <Filter className='size-3.5 text-muted-foreground' />
        {READ_FILTERS.map((value) => (
          <FilterChip
            key={value}
            active={filter === value}
            onClick={() => updateLocation(value, 1)}
            label={t(`notificationsPage.filters.${value}`)}
          />
        ))}
      </div>

      <section className='rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5'>
        {isLoading ? (
          <div className='space-y-3'>
            {Array.from({ length: 5 }, (_, index) => (
              <NotificationSkeleton key={index} />
            ))}
          </div>
        ) : data.items.length ? (
          <>
            <div className='space-y-2'>
              {data.items.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} role={role} fetcher={fetcher} />
              ))}
            </div>
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              setPage={(nextPage) => updateLocation(filter, nextPage)}
              from={from}
              to={to}
              total={data.total}
              tKeyPrefix='notificationsPage.pagination'
            />
          </>
        ) : (
          <div className='flex flex-col items-center gap-3 py-12 text-center'>
            <Bell className='size-8 text-muted-foreground/40' />
            <p className='text-sm font-semibold text-foreground'>{t('notificationsPage.empty.title')}</p>
            <p className='max-w-sm text-xs text-muted-foreground'>{t('notificationsPage.empty.description')}</p>
          </div>
        )}
      </section>
    </div>
  )
}

function NotificationItem({
  notification,
  role,
  fetcher
}: {
  notification: NotificationListResDtoOutputItemsItem
  role: NotificationRole
  fetcher: ReturnType<typeof useFetcher<NotificationActionResult>>
}) {
  const { t, i18n } = useTranslation('common')
  const target = notificationTarget(notification, role)
  const tone = notification.type ? TYPE_TONE[notification.type] : TYPE_TONE.SYSTEM

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-3 shadow-sm sm:flex-row sm:items-start',
        !notification.isRead && 'border-primary/30 bg-primary/5'
      )}
    >
      <span
        className={cn(
          'inline-flex shrink-0 self-start rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
          tone
        )}
      >
        {notification.type ? t(`notificationsPage.type.${notification.type}`) : '—'}
      </span>
      <div className='min-w-0 flex-1 space-y-1'>
        <p className={cn('text-sm leading-snug', notification.isRead ? 'text-muted-foreground' : 'font-semibold')}>
          {notification.content || t('notificationsPage.item.noContent')}
        </p>
        <p className='text-[10px] text-muted-foreground'>
          {formatDate(notification.createdAt, i18n.language)}
          {notification.referenceType && notification.referenceId && (
            <>
              {' · '}
              {t('notificationsPage.item.reference', {
                type: notification.referenceType,
                id: notification.referenceId.slice(0, 8)
              })}
            </>
          )}
        </p>
      </div>
      <div className='flex shrink-0 items-center gap-2 self-start'>
        {target && (
          <Link
            to={target}
            className='inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-bold text-primary shadow-sm hover:bg-muted'
          >
            {t('notificationsPage.item.openTarget')}
            <ArrowUpRight className='size-3' />
          </Link>
        )}
        {!notification.isRead && (
          <fetcher.Form method='post'>
            <input type='hidden' name='id' value={notification.id} />
            <button
              name='intent'
              value='markRead'
              disabled={fetcher.state !== 'idle'}
              className='inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-bold shadow-sm hover:bg-muted disabled:opacity-50'
            >
              <Check className='size-3' />
              {t('notificationsPage.actions.markRead')}
            </button>
          </fetcher.Form>
        )}
      </div>
    </article>
  )
}

function NotificationSkeleton() {
  return (
    <div className='flex items-start gap-3 rounded-lg border border-border p-3'>
      <div className='h-4 w-16 animate-pulse rounded-full bg-muted' />
      <div className='flex-1 space-y-2'>
        <div className='h-3 w-3/4 animate-pulse rounded bg-muted' />
        <div className='h-2.5 w-1/3 animate-pulse rounded bg-muted' />
      </div>
    </div>
  )
}

function readFilter(value: string | null): (typeof READ_FILTERS)[number] {
  return value === 'unread' || value === 'read' ? value : 'all'
}

function positiveInteger(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function formatDate(value: string, locale: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date)
}

function notificationTarget(item: NotificationListResDtoOutputItemsItem, role: NotificationRole) {
  if (!item.referenceType || !item.referenceId) return null
  const prefix = item.referenceType.split('_')[0]
  const id = encodeURIComponent(item.referenceId)

  if (role === 'EDITOR') {
    if (['PROPOSAL', 'SERIES', 'FRANCHISE'].includes(prefix)) return `/dashboard/editor/proposals/${id}`
    if (prefix === 'NAME' || prefix === 'REVISION') return `/dashboard/editor/proposals?referenceId=${id}`
    if (prefix === 'CONTRACT') return `/dashboard/editor/contracts/${id}`
    if (prefix === 'AMENDMENT' || prefix === 'PAYMENT') return `/dashboard/editor/contracts?referenceId=${id}`
    if (['CHAPTER', 'MANUSCRIPT', 'PAGE'].includes(prefix))
      return `/dashboard/editor/publication?referenceId=${id}&referenceType=${prefix}`
    if (prefix === 'DEADLINE') return `/dashboard/editor/operations/deadlines?requestId=${id}`
    if (prefix === 'BOARD') return `/dashboard/editor/board/sessions/${id}`
    if (prefix === 'DECISION') return `/dashboard/editor/board/decisions/${id}`
    if (prefix === 'SURVEY' || prefix === 'RANKING') return `/dashboard/editor/operations/surveys?referenceId=${id}`
    if (prefix === 'REPRINT') return `/dashboard/editor/operations/reprints?requestId=${id}`
    if (prefix === 'TRANSFER') return `/dashboard/editor/operations/transfers?requestId=${id}`
    if (prefix === 'REVIEW') return `/dashboard/editor/operations/reviews?reviewId=${id}`
    return null
  }

  if (role === 'BOARD_MEMBER') {
    if (prefix === 'DECISION') return `/dashboard/board/decisions/${id}`
    if (prefix === 'BOARD') return `/dashboard/board/sessions/${id}`
    if (prefix === 'CONTRACT') return `/dashboard/board/contracts/${id}`
    if (prefix === 'PAYMENT') return `/dashboard/board/payments?paymentId=${id}`
    if (prefix === 'DEADLINE') return `/dashboard/board/deadlines?requestId=${id}`
    if (prefix === 'REPRINT') return `/dashboard/board/reprints?requestId=${id}`
    if (prefix === 'TRANSFER') return `/dashboard/board/transfers?requestId=${id}`
    if (prefix === 'RANKING' || prefix === 'SURVEY') return `/dashboard/board/rankings?surveyPeriodId=${id}`
    return null
  }

  if (role === 'SUPER_ADMIN') {
    if (prefix === 'DECISION') return `/dashboard/admin/board/decisions/${id}`
    if (prefix === 'BOARD') return `/dashboard/admin/board/sessions/${id}`
    if (prefix === 'PAYMENT') return `/dashboard/admin/board/payments?paymentId=${id}`
    if (prefix === 'SURVEY' || prefix === 'RANKING') return `/dashboard/admin/operations/surveys?surveyId=${id}`
    return adminAuditTarget(id, auditEntityType(prefix))
  }

  if (['PROPOSAL', 'SERIES', 'FRANCHISE'].includes(prefix)) return `/dashboard/mangaka/series/${id}`
  if (prefix === 'CONTRACT') return `/dashboard/mangaka/contracts/${id}`
  if (prefix === 'REPRINT') return `/dashboard/mangaka/reprints?requestId=${id}`
  if (prefix === 'TRANSFER') return `/dashboard/mangaka/transfers?requestId=${id}`
  if (prefix === 'TASK') return `/dashboard/mangaka/studio?taskId=${id}`
  return null
}

function adminAuditTarget(id: string, entityType?: string) {
  const params = new URLSearchParams({ entityId: id })
  if (entityType) params.set('entityType', entityType)
  return `/dashboard/admin/audit?${params.toString()}`
}

function auditEntityType(prefix: string) {
  const mapping: Record<string, string> = {
    PROPOSAL: 'SERIES',
    SERIES: 'SERIES',
    FRANCHISE: 'SERIES',
    CHAPTER: 'CHAPTER',
    MANUSCRIPT: 'MANUSCRIPT',
    PAGE: 'PAGE',
    TASK: 'TASK',
    CONTRACT: 'CONTRACT',
    DEADLINE: 'DEADLINE_REQUEST',
    REPRINT: 'REPRINT_REQUEST',
    TRANSFER: 'TRANSFER_REQUEST',
    PUBLICATION: 'PUBLICATION_VERSION',
    USER: 'USER'
  }
  return mapping[prefix]
}
