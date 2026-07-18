import { Loader2, Vote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BoardDecisionResDtoOutput, BoardSessionResDtoOutput } from '~/api/model/board'
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
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  sessions: BoardSessionResDtoOutput[]
  decisions: BoardDecisionResDtoOutput[]
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  useBoardAutoRefresh()
  const activeSessions = sessions.filter((item) => item.status === 'ACTIVE')

  return (
    <BoardPageLayout
      titleKey='board.sections.decisions'
      descriptionKey='board.sectionDescriptions.decisions'
      hasError={hasError}
    >
      <div className='grid gap-5 xl:grid-cols-2'>
        <CreateSerializationDecision series={series} sessions={activeSessions} />
        <CastVoteForm decisions={decisions.filter((item) => item.result === 'PENDING')} />
      </div>
      <BoardPanel title={t('board.decisionList')}>
        <div className='grid gap-3 md:grid-cols-2'>
          {decisions.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} series={series} />
          ))}
          {!decisions.length && <p className='text-sm text-muted-foreground'>{t('board.emptyDecisions')}</p>}
        </div>
      </BoardPanel>
    </BoardPageLayout>
  )
}

function CreateSerializationDecision({
  series,
  sessions
}: {
  series: SeriesListResDtoOutputItemsItem[]
  sessions: BoardSessionResDtoOutput[]
}) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()

  return (
    <BoardPanel title={t('board.decisionTitle')}>
      <p className='mb-4 text-sm text-muted-foreground'>{t('board.decisionDescription')}</p>
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='intent' value='createDecision' />
        <SelectSession sessions={sessions} />
        <SelectSeries series={series} />
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
        <SubmitButton
          label={t('actions.createDecision')}
          disabled={!series.length || !sessions.length}
          loading={fetcher.state !== 'idle'}
        />
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </BoardPanel>
  )
}

function CastVoteForm({ decisions }: { decisions: BoardDecisionResDtoOutput[] }) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()

  return (
    <BoardPanel title={t('board.voteTitle')}>
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='intent' value='castVote' />
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.selectDecision')}
          <select className={boardInput} name='decisionId' required defaultValue=''>
            <option value='' disabled>
              {t('board.selectDecision')}
            </option>
            {decisions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.decisionType ?? 'DECISION'} · {item.targetSeriesId?.slice(-6) ?? '—'}
              </option>
            ))}
          </select>
        </label>
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.voteValue')}
          <select className={boardInput} name='voteValue' required defaultValue='APPROVE'>
            <option value='APPROVE'>{t('board.votes.approve')}</option>
            <option value='REJECT'>{t('board.votes.reject')}</option>
            <option value='ABSTAIN'>{t('board.votes.abstain')}</option>
          </select>
        </label>
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.voteNote')}
          <textarea className={`${boardInput} min-h-24 py-2`} name='note' />
        </label>
        <SubmitButton label={t('actions.castVote')} disabled={!decisions.length} loading={fetcher.state !== 'idle'} />
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </BoardPanel>
  )
}

function DecisionCard({
  decision,
  series
}: {
  decision: BoardDecisionResDtoOutput
  series: SeriesListResDtoOutputItemsItem[]
}) {
  const { t } = useTranslation('editor')
  const seriesTitle = series.find((item) => item.id === decision.targetSeriesId)?.title

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
    </article>
  )
}

function SelectSession({ sessions }: { sessions: BoardSessionResDtoOutput[] }) {
  const { t } = useTranslation('editor')
  return (
    <label className='grid gap-1.5 text-sm font-semibold'>
      {t('board.selectSession')}
      <select className={boardInput} name='sessionId' required defaultValue=''>
        <option value='' disabled>
          {t('board.selectSession')}
        </option>
        {sessions.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </select>
    </label>
  )
}

function SelectSeries({ series }: { series: SeriesListResDtoOutputItemsItem[] }) {
  const { t } = useTranslation('editor')
  return (
    <label className='grid gap-1.5 text-sm font-semibold'>
      {t('board.selectSeries')}
      <select className={boardInput} name='seriesId' required defaultValue=''>
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
