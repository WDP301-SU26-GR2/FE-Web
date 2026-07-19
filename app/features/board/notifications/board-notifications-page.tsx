import { useEffect, useState } from 'react'
import { Link, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import type { NotificationListResDtoOutput } from '~/api/model/notifications'
import { BoardFeedback, BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'
import type { BoardActionResult } from '../types'

export function BoardNotificationsPage({
  data,
  linkRole = 'BOARD_MEMBER'
}: {
  data: NotificationListResDtoOutput
  linkRole?: 'BOARD_MEMBER' | 'SUPER_ADMIN'
}) {
  const { t, i18n } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  const [readFilter, setReadFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const notificationTypes = [...new Set(data.items.flatMap((item) => (item.type ? [item.type] : [])))]
  const filteredItems = data.items.filter(
    (item) =>
      (!typeFilter || item.type === typeFilter) &&
      (!readFilter || (readFilter === 'READ' ? item.isRead : !item.isRead))
  )
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) window.dispatchEvent(new Event('notifications:changed'))
  }, [fetcher.data, fetcher.state])
  return (
    <div className='space-y-6 pb-12'>
      {linkRole === 'SUPER_ADMIN' && (
        <Link to='/dashboard/admin' className='inline-flex items-center gap-2 text-sm font-bold text-primary'>
          <ArrowLeft className='size-4' />
          {t('common.back')}
        </Link>
      )}
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <BoardHeader
          title={t('notifications.title')}
          description={t('notifications.description', { count: data.unreadCount })}
        />
        <fetcher.Form method='post'>
          <button
            name='intent'
            value='all'
            className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'
          >
            {t('notifications.readAll')}
          </button>
        </fetcher.Form>
      </div>
      <BoardFeedback data={fetcher.data} />
      <div className='grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-2'>
          <select className='h-10 rounded-md border border-input bg-background px-3 text-sm' value={readFilter} onChange={(event) => setReadFilter(event.target.value)}>
            <option value=''>{t('filters.allReadStates')}</option>
            <option value='UNREAD'>{t('filters.unread')}</option>
            <option value='READ'>{t('filters.read')}</option>
          </select>
          <select className='h-10 rounded-md border border-input bg-background px-3 text-sm' value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value=''>{t('filters.allNotificationTypes')}</option>
            {notificationTypes.map((value) => (
              <option key={value} value={value}>{t(`filters.notificationTypes.${value}`, { defaultValue: value })}</option>
            ))}
          </select>
      </div>
      <div className='divide-y divide-border overflow-hidden rounded-xl border border-border bg-card'>
        {filteredItems.map((item) => (
          <article key={item.id} className={`p-4 ${item.isRead ? '' : 'bg-primary/5'}`}>
            <div className='flex justify-between gap-3'>
              <StatusBadge value={item.type ?? 'SYSTEM'} />
              <time className='text-xs text-muted-foreground'>
                {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
                  new Date(item.createdAt)
                )}
              </time>
            </div>
            <p className='mt-3 text-sm text-muted-foreground'>{item.content}</p>
            {notificationHref(item.referenceType, item.referenceId, linkRole) ? (
              <Link className='mt-3 inline-flex text-xs font-bold text-primary' to={notificationHref(item.referenceType, item.referenceId, linkRole)!}>
                {t('notifications.open')}
              </Link>
            ) : null}
            {!item.isRead && (
              <fetcher.Form method='post' className='mt-3'>
                <input type='hidden' name='id' value={item.id} />
                <button name='intent' value='read' className='text-xs font-bold text-primary'>
                  {t('notifications.read')}
                </button>
              </fetcher.Form>
            )}
          </article>
        ))}
      </div>
      {!filteredItems.length && <EmptyState text={t('notifications.empty')} />}
    </div>
  )
}

function notificationHref(
  referenceType: string | null,
  referenceId: string | null,
  linkRole: 'BOARD_MEMBER' | 'SUPER_ADMIN'
) {
  if (!referenceType || !referenceId) return null
  if (linkRole === 'SUPER_ADMIN') {
    if (referenceType.startsWith('DECISION_')) return `/dashboard/admin/board/decisions/${referenceId}`
    if (referenceType.startsWith('BOARD_')) return `/dashboard/admin/board/sessions/${referenceId}`
    if (referenceType.startsWith('PAYMENT_'))
      return `/dashboard/admin/board/payments?paymentId=${encodeURIComponent(referenceId)}`
    if (referenceType.startsWith('SURVEY_') || referenceType.startsWith('RANKING_'))
      return `/dashboard/admin/operations/surveys?surveyId=${encodeURIComponent(referenceId)}`
    if (referenceType.startsWith('PROPOSAL_') || referenceType.startsWith('SERIES_') || referenceType.startsWith('FRANCHISE_'))
      return adminAuditHref(referenceId, 'SERIES')
    if (referenceType.startsWith('CHAPTER_')) return adminAuditHref(referenceId, 'CHAPTER')
    if (referenceType.startsWith('MANUSCRIPT_')) return adminAuditHref(referenceId, 'MANUSCRIPT')
    if (referenceType.startsWith('PAGE_')) return adminAuditHref(referenceId, 'PAGE')
    if (referenceType.startsWith('TASK_')) return adminAuditHref(referenceId, 'TASK')
    if (referenceType.startsWith('CONTRACT_')) return adminAuditHref(referenceId, 'CONTRACT')
    if (referenceType.startsWith('DEADLINE_')) return adminAuditHref(referenceId, 'DEADLINE_REQUEST')
    if (referenceType.startsWith('REPRINT_')) return adminAuditHref(referenceId, 'REPRINT_REQUEST')
    if (referenceType.startsWith('TRANSFER_')) return adminAuditHref(referenceId, 'TRANSFER_REQUEST')
    if (referenceType.startsWith('PUBLICATION_')) return adminAuditHref(referenceId, 'PUBLICATION_VERSION')
    if (referenceType.startsWith('USER_')) return adminAuditHref(referenceId, 'USER')
    return adminAuditHref(referenceId)
  }
  if (referenceType.startsWith('DECISION_')) return `/dashboard/board/decisions/${referenceId}`
  if (referenceType.startsWith('BOARD_')) return `/dashboard/board/sessions/${referenceId}`
  if (referenceType.startsWith('CONTRACT_')) return `/dashboard/board/contracts/${referenceId}`
  if (referenceType.startsWith('PAYMENT_')) return '/dashboard/board/payments'
  if (referenceType.startsWith('REPRINT_')) return `/dashboard/board/reprints?requestId=${encodeURIComponent(referenceId)}`
  if (referenceType.startsWith('TRANSFER_')) return '/dashboard/board/transfers'
  if (referenceType.startsWith('RANKING_') || referenceType.startsWith('SURVEY_')) return '/dashboard/board/rankings'
  return null
}

function adminAuditHref(referenceId: string, entityType?: string) {
  const params = new URLSearchParams({ entityId: referenceId })
  if (entityType) params.set('entityType', entityType)
  return `/dashboard/admin/audit?${params.toString()}`
}
