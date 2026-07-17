import { useState } from 'react'
import { Loader2, Vote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BoardDecisionResDtoOutput, BoardSessionResDtoOutput } from '~/api/model/board'
import type { BoardSessionPhase } from '~/api/manual/board-meeting'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import {
  boardInput,
  BoardFeedback,
  BoardPageLayout,
  BoardPanel,
  BoardStatus,
  useBoardAutoRefresh,
  useBoardFetcher
} from './components/board-shared'

export function EditorBoardDecisionsPage({
  series,
  sessions,
  decisions,
  sessionPhases,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  sessions: BoardSessionResDtoOutput[]
  decisions: BoardDecisionResDtoOutput[]
  sessionPhases: Record<string, BoardSessionPhase>
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const [selectedSeriesId, setSelectedSeriesId] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')
  useBoardAutoRefresh()
  const eligibleSessions = sessions.filter((session) => {
    if (session.status !== 'UPCOMING' && session.status !== 'ACTIVE') return false
    const sessionDecisions = decisions.filter((decision) => decision.boardSessionId === session.id)
    return (
      session.seriesId === selectedSeriesId &&
      (sessionDecisions.length === 0 ||
        sessionDecisions.some((decision) => decision.targetSeriesId === selectedSeriesId))
    )
  })
  const visibleDecisions = decisions.filter(
    (decision) => decision.targetSeriesId === selectedSeriesId && decision.boardSessionId === selectedSessionId
  )

  function selectSeries(seriesId: string) {
    setSelectedSeriesId(seriesId)
    setSelectedSessionId('')
  }

  return (
    <BoardPageLayout
      titleKey='board.sections.decisions'
      descriptionKey='board.sectionDescriptions.decisions'
      hasError={hasError}
    >
      <div className='max-w-3xl'>
        <CreateSerializationDecision
          series={series}
          sessions={eligibleSessions}
          selectedSeriesId={selectedSeriesId}
          selectedSessionId={selectedSessionId}
          onSelectSeries={selectSeries}
          onSelectSession={setSelectedSessionId}
        />
      </div>
      {selectedSeriesId && selectedSessionId && (
        <BoardPanel title={t('board.decisionList')}>
          <div className='grid gap-3 md:grid-cols-2'>
            {visibleDecisions.map((decision) => (
              <DecisionCard
                key={decision.id}
                decision={decision}
                series={series}
                canVote={sessions.some(
                  (session) =>
                    session.id === decision.boardSessionId &&
                    session.status === 'ACTIVE' &&
                    sessionPhases[session.id] === 'VOTING'
                )}
              />
            ))}
            {!visibleDecisions.length && (
              <p className='text-sm text-muted-foreground'>{t('board.emptyDecisionsForSelection')}</p>
            )}
          </div>
        </BoardPanel>
      )}
    </BoardPageLayout>
  )
}

function CreateSerializationDecision({
  series,
  sessions,
  selectedSeriesId,
  selectedSessionId,
  onSelectSeries,
  onSelectSession
}: {
  series: SeriesListResDtoOutputItemsItem[]
  sessions: BoardSessionResDtoOutput[]
  selectedSeriesId: string
  selectedSessionId: string
  onSelectSeries: (seriesId: string) => void
  onSelectSession: (sessionId: string) => void
}) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()

  return (
    <BoardPanel title={t('board.decisionTitle')}>
      <p className='mb-4 text-sm text-muted-foreground'>{t('board.decisionDescription')}</p>
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='intent' value='createDecision' />
        <SelectSeries series={series} value={selectedSeriesId} onChange={onSelectSeries} />
        {selectedSeriesId && <SelectSession sessions={sessions} value={selectedSessionId} onChange={onSelectSession} />}
        {selectedSeriesId && !sessions.length && (
          <p className='rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground'>
            {t('board.noEligibleSessions')}
          </p>
        )}
        {selectedSessionId && (
          <>
            <label className='grid gap-1.5 text-sm font-semibold'>
              {t('board.magazine')}
              <input className={boardInput} name='magazine' required />
            </label>
            <div className='grid gap-3 sm:grid-cols-2'>
              <label className='grid gap-1.5 text-sm font-semibold'>
                {t('board.startIssue')}
                <input className={boardInput} name='startIssueNumber' type='number' min={1} required />
              </label>
              <label className='grid gap-1.5 text-sm font-semibold'>
                {t('proposalDetail.publicationType')}
                <select className={boardInput} name='publicationType' required defaultValue='WEEKLY'>
                  <option value='WEEKLY'>WEEKLY</option>
                  <option value='BIWEEKLY'>BIWEEKLY</option>
                  <option value='MONTHLY'>MONTHLY</option>
                  <option value='IRREGULAR'>IRREGULAR</option>
                </select>
              </label>
            </div>
          </>
        )}
        {selectedSessionId && (
          <SubmitButton
            label={t('actions.createDecision')}
            disabled={!selectedSeriesId || !selectedSessionId}
            loading={fetcher.state !== 'idle'}
          />
        )}
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </BoardPanel>
  )
}

function DecisionCard({
  decision,
  series,
  canVote
}: {
  decision: BoardDecisionResDtoOutput
  series: SeriesListResDtoOutputItemsItem[]
  canVote: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()
  const seriesTitle = series.find((item) => item.id === decision.targetSeriesId)?.title
  const open = canVote && (decision.result === 'PENDING' || decision.result === 'PENDING_QUORUM')

  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h3 className='font-bold text-foreground'>{seriesTitle ?? decision.targetSeriesId ?? '—'}</h3>
          <p className='mt-1 text-xs font-semibold text-muted-foreground'>{decision.decisionType ?? '—'}</p>
        </div>
        <BoardStatus value={decision.result ?? 'PENDING'} />
      </div>
      <p className='mt-3 text-sm text-muted-foreground'>
        {t('board.voteSummary', {
          approve: decision.approveCount,
          reject: decision.rejectCount,
          total: decision.totalVotes
        })}
      </p>
      {open && (
        <fetcher.Form method='post' className='mt-4 grid gap-2 border-t border-border pt-3'>
          <input type='hidden' name='intent' value='castVote' />
          <input type='hidden' name='decisionId' value={decision.id} />
          <input name='note' maxLength={300} className={boardInput} placeholder={t('board.voteNote')} />
          <div className='grid grid-cols-3 gap-2'>
            {(['APPROVE', 'REJECT', 'ABSTAIN'] as const).map((voteValue) => (
              <button
                key={voteValue}
                name='voteValue'
                value={voteValue}
                disabled={fetcher.state !== 'idle'}
                className='rounded-md border border-border px-2 py-2 text-xs font-bold text-foreground disabled:opacity-50'
              >
                {t(`board.voteValues.${voteValue}`)}
              </button>
            ))}
          </div>
        </fetcher.Form>
      )}
      <BoardFeedback data={fetcher.data} />
    </article>
  )
}

function SelectSession({
  sessions,
  value,
  onChange
}: {
  sessions: BoardSessionResDtoOutput[]
  value: string
  onChange: (sessionId: string) => void
}) {
  const { t } = useTranslation('editor')
  return (
    <label className='grid gap-1.5 text-sm font-semibold'>
      {t('board.selectSession')}
      <select
        className={boardInput}
        name='sessionId'
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value='' disabled>
          {t('board.selectSession')}
        </option>
        {sessions.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title} · {item.status}
          </option>
        ))}
      </select>
    </label>
  )
}

function SelectSeries({
  series,
  value,
  onChange
}: {
  series: SeriesListResDtoOutputItemsItem[]
  value: string
  onChange: (seriesId: string) => void
}) {
  const { t } = useTranslation('editor')
  return (
    <label className='grid gap-1.5 text-sm font-semibold'>
      {t('board.selectSeries')}
      <select
        className={boardInput}
        name='seriesId'
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value='' disabled>
          {t('board.selectSeries')}
        </option>
        {series.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </select>
    </label>
  )
}

function SubmitButton({ label, disabled, loading }: { label: string; disabled: boolean; loading: boolean }) {
  return (
    <button
      disabled={disabled || loading}
      className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
    >
      {loading ? <Loader2 className='size-4 animate-spin' /> : <Vote className='size-4' />}
      {label}
    </button>
  )
}
