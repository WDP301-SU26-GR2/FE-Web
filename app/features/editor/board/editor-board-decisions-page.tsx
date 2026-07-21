import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Loader2, Plus, Vote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BoardDecisionResDtoOutput, BoardSessionResDtoOutput } from '~/api/model/board'
import type { BoardSessionPhase } from '~/api/manual/board-meeting'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { useAuth } from '~/features/auth/context/auth-context'
import { Dialog } from '~/shared/ui/dialog'
import { useEditorSessionVoteProgress } from './hooks/use-editor-session-vote-progress'
import { orderBoardDecisions, orderBoardSessions } from './board-order'
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
  hasError,
  backPath = '/dashboard/editor/board',
  detailBasePath
}: {
  series: SeriesListResDtoOutputItemsItem[]
  sessions: BoardSessionResDtoOutput[]
  decisions: BoardDecisionResDtoOutput[]
  sessionPhases: Record<string, BoardSessionPhase>
  hasError: boolean
  backPath?: string
  detailBasePath?: string
}) {
  const { t } = useTranslation('editor')
  const { session: authSession } = useAuth()
  const [selectedSeriesId, setSelectedSeriesId] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [decisionType, setDecisionType] = useState('')
  const [decisionResult, setDecisionResult] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  useBoardAutoRefresh()
  const realtime = useEditorSessionVoteProgress(sessions, decisions)
  const eligibleSessions = orderBoardSessions(
    sessions.filter((session) => session.status === 'UPCOMING' || session.status === 'ACTIVE')
  )
  const visibleDecisions = orderBoardDecisions(
    realtime.decisions.filter(
      (decision) =>
        (!selectedSeriesId || decision.targetSeriesId === selectedSeriesId) &&
        (!selectedSessionId || decision.boardSessionId === selectedSessionId) &&
        (!decisionType || decision.decisionType === decisionType) &&
        (!decisionResult || decision.result === decisionResult)
    )
  )
  const hasExistingDecision = realtime.decisions.some(
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
      backPath={backPath}
    >
      <div className='flex justify-end'>
        <button
          type='button'
          onClick={() => setCreateOpen(true)}
          className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'
        >
          <Plus className='size-4' />
          {t('actions.createDecision')}
        </button>
      </div>
      {createOpen && (
        <CreateSerializationDecision
          series={series}
          sessions={eligibleSessions}
          selectedSeriesId={selectedSeriesId}
          selectedSessionId={selectedSessionId}
          hasExistingDecision={hasExistingDecision}
          onSelectSeries={selectSeries}
          onSelectSession={setSelectedSessionId}
          onClose={() => setCreateOpen(false)}
        />
      )}
      <BoardPanel title={t('board.decisionList')}>
        <div className='mb-4 grid gap-2 rounded-lg border border-border bg-muted/30 p-3 md:grid-cols-2 xl:grid-cols-4'>
          <select
            className={boardInput}
            value={selectedSeriesId}
            onChange={(event) => selectSeries(event.target.value)}
          >
            <option value=''>{t('board.filters.allSeries')}</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <select
            className={boardInput}
            value={selectedSessionId}
            onChange={(event) => setSelectedSessionId(event.target.value)}
          >
            <option value=''>{t('board.filters.allSessions')}</option>
            {sessions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <select className={boardInput} value={decisionType} onChange={(event) => setDecisionType(event.target.value)}>
            <option value=''>{t('board.filters.allDecisionTypes')}</option>
            {[...new Set(realtime.decisions.flatMap((item) => (item.decisionType ? [item.decisionType] : [])))].map(
              (value) => (
                <option key={value} value={value}>
                  {t(`board.decisionTypeLabels.${value}`, { defaultValue: value })}
                </option>
              )
            )}
          </select>
          <select
            className={boardInput}
            value={decisionResult}
            onChange={(event) => setDecisionResult(event.target.value)}
          >
            <option value=''>{t('board.filters.allResults')}</option>
            {['PENDING', 'PENDING_QUORUM', 'APPROVED', 'REJECTED', 'EXPIRED'].map((value) => (
              <option key={value} value={value}>
                {t(`board.decisionResultLabels.${value}`, { defaultValue: value })}
              </option>
            ))}
          </select>
        </div>
        <div className='grid gap-3 md:grid-cols-2'>
          {visibleDecisions.map((decision) => (
            <DecisionCard
              key={decision.id}
              decision={decision}
              series={series}
              sessions={sessions}
              detailBasePath={detailBasePath}
              canVote={sessions.some(
                (session) =>
                  session.id === decision.boardSessionId &&
                  session.status === 'ACTIVE' &&
                  (realtime.sessionPhases[session.id] ?? sessionPhases[session.id]) === 'VOTING' &&
                  session.allowedEditorIds.includes(authSession?.user.id ?? '')
              )}
            />
          ))}
          {!visibleDecisions.length && (
            <p className='text-sm text-muted-foreground'>{t('board.emptyDecisionsForSelection')}</p>
          )}
        </div>
      </BoardPanel>
    </BoardPageLayout>
  )
}

function CreateSerializationDecision({
  series,
  sessions,
  selectedSeriesId,
  selectedSessionId,
  hasExistingDecision,
  onSelectSeries,
  onSelectSession,
  onClose
}: {
  series: SeriesListResDtoOutputItemsItem[]
  sessions: BoardSessionResDtoOutput[]
  selectedSeriesId: string
  selectedSessionId: string
  hasExistingDecision: boolean
  onSelectSeries: (seriesId: string) => void
  onSelectSession: (sessionId: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <Dialog
      open
      onClose={onClose}
      titleId='create-serialization-decision'
      title={t('board.decisionTitle')}
      description={t('board.decisionDescription')}
      size='lg'
    >
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='intent' value='createDecision' />
        <SelectSeries series={series} value={selectedSeriesId} onChange={onSelectSeries} />
        {selectedSeriesId && <SelectSession sessions={sessions} value={selectedSessionId} onChange={onSelectSession} />}
        {selectedSeriesId && !sessions.length && (
          <p className='rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground'>
            {t('board.noEligibleSessions')}
          </p>
        )}
        {selectedSessionId &&
          (hasExistingDecision ? (
            <p className='rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground'>
              {t('board.decisionAlreadyExists')}
            </p>
          ) : (
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
                    <option value='MONTHLY'>MONTHLY</option>
                    <option value='IRREGULAR'>IRREGULAR</option>
                  </select>
                </label>
              </div>
            </>
          ))}
        {selectedSessionId && !hasExistingDecision && (
          <div className='flex justify-end gap-2 border-t border-border pt-4'>
            <button
              type='button'
              onClick={onClose}
              className='h-10 rounded-md border border-border px-4 text-sm font-bold'
            >
              {t('actions.cancel')}
            </button>
            <SubmitButton
              label={t('actions.createDecision')}
              disabled={!selectedSeriesId || !selectedSessionId}
              loading={fetcher.state !== 'idle'}
            />
          </div>
        )}
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </Dialog>
  )
}

function DecisionCard({
  decision,
  series,
  sessions,
  canVote,
  detailBasePath
}: {
  decision: BoardDecisionResDtoOutput
  series: SeriesListResDtoOutputItemsItem[]
  sessions: BoardSessionResDtoOutput[]
  canVote: boolean
  detailBasePath?: string
}) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()
  const seriesTitle = decision.targetSeries?.title ?? series.find((item) => item.id === decision.targetSeriesId)?.title
  const sessionTitle = sessions.find((item) => item.id === decision.boardSessionId)?.title
  const typeLabel = decision.decisionType
    ? t(`board.decisionTypeLabels.${decision.decisionType}`, { defaultValue: decision.decisionType })
    : t('board.sections.decisions')
  const displayTitle =
    decision.decisionType === 'SERIALIZATION'
      ? t('board.decisionDisplay.serializationTitle', { series: seriesTitle ?? t('board.unknownSeries') })
      : t('board.decisionDisplay.genericTitle', {
          type: typeLabel,
          series: seriesTitle ?? t('board.unknownSeries')
        })
  const open = canVote && (decision.result === 'PENDING' || decision.result === 'PENDING_QUORUM')

  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h3 className='font-bold text-foreground'>
            {detailBasePath ? (
              <Link className='hover:text-primary hover:underline' to={`${detailBasePath}/${decision.id}`}>
                {displayTitle}
              </Link>
            ) : (
              displayTitle
            )}
          </h3>
          <p className='mt-1 text-xs font-semibold text-muted-foreground'>{typeLabel}</p>
          <p className='mt-2 text-xs text-muted-foreground'>
            {t('board.decisionDisplay.sessionLabel')}: {sessionTitle ?? '—'}
          </p>
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
