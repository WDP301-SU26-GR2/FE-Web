import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { BoardMeetingDecision } from '~/api/manual/board-meeting'
import type { BoardSessionResDtoOutput } from '~/api/model/board'
import { BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'
import { useBoardSessionsRealtime } from '../sessions/use-board-sessions-realtime'

export function BoardDecisionsPage({
  sessions,
  decisions,
  hasError
}: {
  sessions: BoardSessionResDtoOutput[]
  decisions: BoardMeetingDecision[]
  hasError: boolean
}) {
  const { t } = useTranslation('board')
  const realtime = useBoardSessionsRealtime(sessions, decisions)
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('decisions.title')} description={t('decisions.description')} />
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-4 md:grid-cols-2'>
        {realtime.decisions.map((decision) => (
          <Link
            key={decision.id}
            to={`/dashboard/board/decisions/${decision.id}`}
            className='rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary'
          >
            <div className='flex justify-between gap-3'>
              <h2 className='font-bold'>{decision.decisionType ?? 'DECISION'}</h2>
              <StatusBadge value={decision.result ?? 'PENDING'} />
            </div>
            <p className='mt-2 text-xs text-muted-foreground'>
              {t('decisions.series')}: {decision.targetSeries?.title ?? decision.targetSeriesId ?? '—'}
            </p>
            <p className='mt-3 text-sm text-muted-foreground'>
              {t('decisions.summary', {
                approve: decision.approveCount,
                reject: decision.rejectCount,
                total: decision.totalVotes
              })}
            </p>
          </Link>
        ))}
      </div>
      {!realtime.decisions.length && <EmptyState text={t('decisions.empty')} />}
    </div>
  )
}
