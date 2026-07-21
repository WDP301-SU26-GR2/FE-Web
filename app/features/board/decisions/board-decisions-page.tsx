import { Link } from 'react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BoardMeetingDecision } from '~/api/manual/board-meeting'
import type { BoardSessionResDtoOutput } from '~/api/model/board'
import { boardInput, BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'
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
  const [search, setSearch] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [decisionType, setDecisionType] = useState('')
  const [result, setResult] = useState('')
  const realtime = useBoardSessionsRealtime(sessions, decisions)
  const decisionTypes = [
    ...new Set(realtime.decisions.flatMap((item) => (item.decisionType ? [item.decisionType] : [])))
  ]
  const filteredDecisions = realtime.decisions.filter(
    (decision) =>
      (!search ||
        `${decision.targetSeries?.title ?? ''} ${decision.targetSeriesId ?? ''} ${sessions.find((session) => session.id === decision.boardSessionId)?.title ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (!sessionId || decision.boardSessionId === sessionId) &&
      (!decisionType || decision.decisionType === decisionType) &&
      (!result || decision.result === result)
  )
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('decisions.title')} description={t('decisions.description')} />
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-4'>
        <input
          className={boardInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('filters.searchDecisions')}
        />
        <select className={boardInput} value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
          <option value=''>{t('filters.allSessions')}</option>
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.title}
            </option>
          ))}
        </select>
        <select className={boardInput} value={decisionType} onChange={(event) => setDecisionType(event.target.value)}>
          <option value=''>{t('filters.allDecisionTypes')}</option>
          {decisionTypes.map((value) => (
            <option key={value} value={value}>
              {t(`filters.decisionTypes.${value}`, { defaultValue: value })}
            </option>
          ))}
        </select>
        <select className={boardInput} value={result} onChange={(event) => setResult(event.target.value)}>
          <option value=''>{t('filters.allDecisionResults')}</option>
          {['PENDING', 'PENDING_QUORUM', 'APPROVED', 'REJECTED', 'EXPIRED'].map((value) => (
            <option key={value} value={value}>
              {t(`filters.decisionResults.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div className='grid gap-4 md:grid-cols-2'>
        {filteredDecisions.map((decision) => {
          const seriesTitle = decision.targetSeries?.title ?? decision.targetSeriesId ?? t('decisions.unknownSeries')
          const session = sessions.find((item) => item.id === decision.boardSessionId)
          const typeLabel = decision.decisionType
            ? t(`filters.decisionTypes.${decision.decisionType}`, { defaultValue: decision.decisionType })
            : t('decisions.title')
          const displayTitle =
            decision.decisionType === 'SERIALIZATION'
              ? t('decisions.serializationTitle', { series: seriesTitle })
              : t('decisions.genericTitle', { type: typeLabel, series: seriesTitle })

          return (
            <Link
              key={decision.id}
              to={`/dashboard/board/decisions/${decision.id}`}
              className='rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <h2 className='font-bold text-foreground'>{displayTitle}</h2>
                  <p className='mt-1 text-xs font-semibold text-muted-foreground'>{typeLabel}</p>
                </div>
                <StatusBadge value={decision.result ?? 'PENDING'} />
              </div>
              <p className='mt-3 text-xs text-muted-foreground'>
                {t('decisions.sessionLabel')}: {session?.title ?? '—'}
              </p>
              <p className='mt-3 text-sm text-muted-foreground'>
                {t('decisions.summary', {
                  approve: decision.approveCount,
                  reject: decision.rejectCount,
                  total: decision.totalVotes
                })}
              </p>
            </Link>
          )
        })}
      </div>
      {!filteredDecisions.length && <EmptyState text={t('decisions.empty')} />}
    </div>
  )
}
