import { useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
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

export function BoardDecisionDetailPage({
  decision,
  votes,
  reports,
  sessionStatus,
  sessionPhase,
  allowedEditorIds
}: {
  decision: BoardMeetingDecision
  votes: BoardVoteResDtoOutput[]
  reports: SeriesReportResDtoOutput[]
  sessionStatus: string
  sessionPhase: BoardSessionPhase
  allowedEditorIds: string[]
}) {
  const { t } = useTranslation('board')
  const { session: authSession } = useAuth()
  const fetcher = useFetcher<BoardActionResult>()
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
    sessionStatus === 'ACTIVE' && livePhase === 'VOTING' && decisionOpen && voterAllowed && !alreadyVoted

  const voteUnavailableReason = !decisionOpen
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
      <BoardHeader
        title={decision.decisionType ?? t('decisions.title')}
        description={`${t('decisions.series')}: ${decision.targetSeries?.title ?? decision.targetSeriesId ?? '—'}`}
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
        <BoardPanel title={t('decisions.castVote')}>
          <fetcher.Form method='post' className='grid gap-3'>
            <input type='hidden' name='intent' value='vote' />
            <select name='voteValue' className={boardInput} defaultValue='APPROVE'>
              <option value='APPROVE'>{t('decisions.approve')}</option>
              <option value='REJECT'>{t('decisions.reject')}</option>
              <option value='ABSTAIN'>{t('decisions.abstain')}</option>
            </select>
            <textarea name='note' className={`${boardInput} min-h-24 py-2`} placeholder={t('decisions.note')} />
            <button className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
              {t('decisions.submitVote')}
            </button>
          </fetcher.Form>
          <BoardFeedback data={fetcher.data} />
        </BoardPanel>
      )}
      {!canVote && voteUnavailableReason && (
        <p className='rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground'>
          {voteUnavailableReason}
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
