import { Link, useFetcher } from 'react-router'
import { ArrowUpRight, Bell, CheckCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { NotificationListResDtoOutput, NotificationListResDtoOutputItemsItem } from '~/api/model/notifications'
import type { EditorActionResult } from '../types'
import { useState } from 'react'

export function EditorNotificationsPage({ data }: { data: NotificationListResDtoOutput }) {
  const { t, i18n } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const [search, setSearch] = useState('')
  const [readState, setReadState] = useState('')
  const [type, setType] = useState('')
  const types = [...new Set(data.items.flatMap((item) => item.type ? [item.type] : []))]
  const filteredItems = data.items.filter((item) =>
    (!search || (item.content ?? '').toLowerCase().includes(search.toLowerCase())) &&
    (!readState || (readState === 'READ' ? item.isRead : !item.isRead)) &&
    (!type || item.type === type)
  )
  return (
    <div className='space-y-6 pb-12'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
            <Bell className='size-4' />
            {t('notifications.eyebrow')}
          </p>
          <h1 className='mt-2 text-3xl font-bold text-foreground'>{t('notifications.title')}</h1>
          <p className='mt-2 text-sm text-muted-foreground'>{t('notifications.unread', { count: data.unreadCount })}</p>
        </div>
        <fetcher.Form method='post'>
          <button
            name='intent'
            value='markAllRead'
            className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'
          >
            <CheckCheck className='size-4' />
            {t('actions.markAllRead')}
          </button>
        </fetcher.Form>
      </header>
      <div className='grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-3'>
        <input className={notificationFilterInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('filters.searchNotifications')} />
        <select className={notificationFilterInput} value={readState} onChange={(event) => setReadState(event.target.value)}>
          <option value=''>{t('filters.allReadStates')}</option>
          <option value='UNREAD'>{t('filters.unread')}</option>
          <option value='READ'>{t('filters.read')}</option>
        </select>
        <select className={notificationFilterInput} value={type} onChange={(event) => setType(event.target.value)}>
          <option value=''>{t('filters.allNotificationTypes')}</option>
          {types.map((value) => <option key={value} value={value}>{t(`filters.notificationTypes.${value}`, { defaultValue: value })}</option>)}
        </select>
      </div>
      <div className='divide-y divide-border overflow-hidden rounded-xl border border-border bg-card'>
        {filteredItems.map((item) => (
          <article key={item.id} className={`p-4 ${item.isRead ? '' : 'bg-primary/5'}`}>
            <div className='flex justify-between gap-3'>
              <strong className='text-sm text-foreground'>{item.type ?? t('notifications.general')}</strong>
              <span className='text-xs text-muted-foreground'>
                {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
                  new Date(item.createdAt)
                )}
              </span>
            </div>
            <p className='mt-2 text-sm text-muted-foreground'>{item.content}</p>
            <div className='mt-3 flex flex-wrap items-center gap-4'>
              {notificationHref(item) && (
                <Link
                  to={notificationHref(item)!}
                  className='inline-flex items-center gap-1 text-xs font-bold text-primary'
                >
                  {t('notifications.open')}
                  <ArrowUpRight className='size-3.5' />
                </Link>
              )}
              {!item.isRead && (
                <fetcher.Form method='post'>
                  <input type='hidden' name='id' value={item.id} />
                  <button name='intent' value='markRead' className='text-xs font-bold text-primary'>
                    {t('actions.markRead')}
                  </button>
                </fetcher.Form>
              )}
            </div>
          </article>
        ))}
        {!filteredItems.length && (
          <p className='p-8 text-center text-sm text-muted-foreground'>{t('notifications.empty')}</p>
        )}
      </div>
    </div>
  )
}

const notificationFilterInput = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary'

function notificationHref(item: NotificationListResDtoOutputItemsItem): string | null {
  if (!item.referenceType || !item.referenceId) return null
  const prefix = item.referenceType.split('_')[0]
  const id = encodeURIComponent(item.referenceId)

  if (['PROPOSAL', 'SERIES', 'FRANCHISE'].includes(prefix)) return `/dashboard/editor/proposals/${id}`
  if (prefix === 'NAME') return `/dashboard/editor/proposals?nameId=${id}`
  if (prefix === 'CONTRACT') return `/dashboard/editor/contracts/${id}`
  if (prefix === 'AMENDMENT' || prefix === 'PAYMENT') return `/dashboard/editor/contracts?referenceId=${id}`
  if (['CHAPTER', 'MANUSCRIPT', 'PAGE'].includes(prefix))
    return `/dashboard/editor/publication?referenceId=${id}&referenceType=${prefix}`
  if (prefix === 'DEADLINE') return `/dashboard/editor/operations/deadlines?requestId=${id}`
  if (prefix === 'BOARD') return `/dashboard/editor/board/sessions?sessionId=${id}`
  if (prefix === 'DECISION') return `/dashboard/editor/board/decisions?decisionId=${id}`
  if (prefix === 'SURVEY' || prefix === 'RANKING') return `/dashboard/editor/operations/surveys?referenceId=${id}`
  if (prefix === 'REVISION') return `/dashboard/editor/proposals?revisionId=${id}`
  if (prefix === 'REVIEW') return `/dashboard/editor/operations/reviews?reviewId=${id}`
  return null
}
