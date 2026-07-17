import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { BoardMeetingSession } from '~/api/manual/board-meeting'
import { BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'

export function BoardSessionsPage({ sessions, hasError }: { sessions: BoardMeetingSession[]; hasError: boolean }) {
  const { t, i18n } = useTranslation('board')
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('sessions.title')} description={t('sessions.description')} />
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-4 md:grid-cols-2'>
        {sessions.map((session) => (
          <Link
            key={session.id}
            to={`/dashboard/board/sessions/${session.id}`}
            className='rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary'
          >
            <div className='flex items-start justify-between gap-3'>
              <h2 className='font-bold text-foreground'>{session.title}</h2>
              <div className='flex gap-2'>
                <StatusBadge value={session.status} />
                <StatusBadge value={session.phase} />
              </div>
            </div>
            <p className='mt-2 text-sm text-muted-foreground'>{session.description || t('common.noDescription')}</p>
            <p className='mt-4 text-xs text-muted-foreground'>
              {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
                new Date(session.startTime)
              )}
            </p>
          </Link>
        ))}
      </div>
      {!sessions.length && <EmptyState text={t('sessions.empty')} />}
    </div>
  )
}
