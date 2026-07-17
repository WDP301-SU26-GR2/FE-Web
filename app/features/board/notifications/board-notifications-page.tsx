import { useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { NotificationListResDtoOutput } from '~/api/model/notifications'
import { BoardFeedback, BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'
import type { BoardActionResult } from '../types'

export function BoardNotificationsPage({ data }: { data: NotificationListResDtoOutput }) {
  const { t, i18n } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  return (
    <div className='space-y-6 pb-12'>
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
      <div className='divide-y divide-border overflow-hidden rounded-xl border border-border bg-card'>
        {data.items.map((item) => (
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
      {!data.items.length && <EmptyState text={t('notifications.empty')} />}
    </div>
  )
}
