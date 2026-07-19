import { useEffect, useState } from 'react'
import { Link, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Vote } from 'lucide-react'
import type { BoardVoteResDtoOutput, SeriesReportResDtoOutput } from '~/api/model/board'
import type { BoardMeetingDecision, BoardSessionPhase } from '~/api/manual/board-meeting'
import { useAuth } from '~/features/auth/context/auth-context'
import {
  boardInput,
  BoardFeedback,
  BoardHeader,
  BoardPanel,
  StatusBadge,
  useBoardPolling
} from '../components/board-ui'
import type { BoardActionResult } from '../types'
import { useSessionVoteProgress } from '../sessions/use-session-vote-progress'
import { Dialog } from '~/shared/ui/dialog'

export function BoardDecisionDetailPage({
  decision,
  votes,
  reports,
  sessionStatus,
  sessionPhase,
  allowedEditorIds,
  readOnly = false,
  backPath
}: {
  decision: BoardMeetingDecision
  votes: BoardVoteResDtoOutput[]
  reports: SeriesReportResDtoOutput[]
  sessionStatus: string
  sessionPhase: BoardSessionPhase
  allowedEditorIds: string[]
  readOnly?: boolean
  backPath?: string
}) {
  const { t } = useTranslation('board')
  const { session: authSession } = useAuth()
  const [voteOpen, setVoteOpen] = useState(false)
  useBoardPolling()
  const meeting = useSessionVoteProgress({
    sessionId: decision.boardSessionId,
    decisions: [decision],
    initialPhase: sessionPhase,
    initialMessages: []
  })
  const liveDecision = meeting.decisions.find((item) => item.id === decision.id) ?? decision
  const livePhase = meeting.phase
  const currentUserId = authSession?.user.id ?? ''
  const voterAllowed = allowedEditorIds.includes(currentUserId)
  const alreadyVoted = votes.some((vote) => vote.voterId === currentUserId)
  const decisionOpen = liveDecision.result === 'PENDING' || liveDecision.result === 'PENDING_QUORUM'
  const canVote =
    !readOnly &&
    sessionStatus === 'ACTIVE' &&
    livePhase === 'VOTING' &&
    decisionOpen &&
    voterAllowed &&
    !alreadyVoted

  const voteUnavailableReason = readOnly
    ? ''
    : !decisionOpen
    ? t('decisions.voteUnavailable.closed')
    : alreadyVoted
      ? t('decisions.voteUnavailable.alreadyVoted')
      : !voterAllowed
        ? t('decisions.voteUnavailable.notInRoster')
        : sessionStatus !== 'ACTIVE'
          ? t('decisions.voteUnavailable.sessionNotActive')
          : livePhase !== 'VOTING'
            ? t('decisions.voteUnavailable.votingNotOpen')
            : ''
  return (
    <div className='space-y-6 pb-12'>
      {backPath && (
        <Link to={backPath} className='inline-flex items-center gap-2 text-sm font-bold text-primary'>
          <ArrowLeft className='size-4' />
          {t('common.back')}
        </Link>
      )}
      <BoardHeader
        title={decision.decisionType ? t(`filters.decisionTypes.${decision.decisionType}`) : t('decisions.title')}
        description={`${t('decisions.series')}: ${decision.targetSeries?.title ?? t('decisions.unknownSeries')}`}
      />
      <BoardPanel title={t('decisions.progress')}>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <StatusBadge value={liveDecision.result ?? 'PENDING'} />
          <strong>
            {t('decisions.summary', {
              approve: liveDecision.approveCount,
              reject: liveDecision.rejectCount,
              total: liveDecision.totalVotes
            })}
          </strong>
        </div>
        <div className='mt-4 h-2 overflow-hidden rounded-full bg-muted'>
          <div
            className='h-full rounded-full bg-primary transition-[width] duration-300'
            style={{
              width: `${allowedEditorIds.length ? Math.min((liveDecision.totalVotes / allowedEditorIds.length) * 100, 100) : 0}%`
            }}
          />
        </div>
      </BoardPanel>
      {canVote && (
        <button
          type='button'
          onClick={() => setVoteOpen(true)}
          className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'
        >
          <Vote className='h-4 w-4' />
          {t('decisions.castVote')}
        </button>
      )}
      {voteOpen && <VoteDialog onClose={() => setVoteOpen(false)} />}
      {!canVote && voteUnavailableReason && (
        <p className='rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground'>
          {voteUnavailableReason}
        </p>
      )}
      {!decisionOpen && sessionStatus === 'ACTIVE' && (
        <p className='rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground'>
          {t('decisions.finalizedSessionHint', { phase: t(`filters.sessionPhases.${livePhase}`) })}
        </p>
      )}
      <div className='grid gap-5 xl:grid-cols-2'>
        <BoardPanel title={t('decisions.votes')}>
          <div className='space-y-2'>
            {votes.map((vote, index) => (
              <div
                key={`${vote.voterId ?? 'vote'}-${index}`}
                className='flex justify-between rounded-lg border border-border p-3 text-sm'
              >
                <span>{vote.voterId}</span>
                <StatusBadge value={vote.voteValue ?? 'ABSTAIN'} />
              </div>
            ))}
          </div>
        </BoardPanel>
        <BoardPanel title={t('reports.title')}>
          <div className='space-y-3'>
            {reports.map((report) => (
              <article key={report.id} className='rounded-lg border border-border p-3'>
                <strong>{report.reportType ?? t('reports.title')}</strong>
                <p className='mt-2 whitespace-pre-wrap text-sm text-muted-foreground'>{report.content}</p>
              </article>
            ))}
          </div>
        </BoardPanel>
      </div>
    </div>
  )
}

function VoteDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <Dialog
      open
      onClose={onClose}
      titleId='board-vote-dialog-title'
      title={t('decisions.castVote')}
      description={t('decisions.voteConfirmation')}
      size='sm'
    >
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='intent' value='vote' />
        <select name='voteValue' className={boardInput} defaultValue='APPROVE'>
          <option value='APPROVE'>{t('decisions.approve')}</option>
          <option value='REJECT'>{t('decisions.reject')}</option>
          <option value='ABSTAIN'>{t('decisions.abstain')}</option>
        </select>
        <textarea name='note' className={`${boardInput} min-h-24 py-2`} placeholder={t('decisions.note')} />
        <div className='flex justify-end gap-2'>
          <button type='button' onClick={onClose} className='h-10 rounded-md border border-border px-4 text-sm font-bold'>
            {t('common.cancel')}
          </button>
          <button
            disabled={fetcher.state !== 'idle'}
            className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60'
          >
            {t('decisions.submitVote')}
          </button>
        </div>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </Dialog>
  )
}
