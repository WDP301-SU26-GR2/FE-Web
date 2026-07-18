import { useFetcher } from 'react-router'
import { Bell, CheckCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { NotificationListResDtoOutput } from '~/api/model/notifications'
import type { EditorActionResult } from '../types'

export function EditorNotificationsPage({ data }: { data: NotificationListResDtoOutput }) {
  const { t, i18n } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
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
      <div className='divide-y divide-border overflow-hidden rounded-xl border border-border bg-card'>
        {data.items.map((item) => (
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
            {!item.isRead && (
              <fetcher.Form method='post' className='mt-3'>
                <input type='hidden' name='id' value={item.id} />
                <button name='intent' value='markRead' className='text-xs font-bold text-primary'>
                  {t('actions.markRead')}
                </button>
              </fetcher.Form>
            )}
          </article>
        ))}
        {!data.items.length && (
          <p className='p-8 text-center text-sm text-muted-foreground'>{t('notifications.empty')}</p>
        )}
      </div>
    </div>
  )
}
