import { useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { BoardDecisionResDtoOutput, BoardVoteResDtoOutput, SeriesReportResDtoOutput } from '~/api/model/board'
import type { BoardSessionPhase } from '~/api/manual/board-meeting'
import {
  boardInput,
  BoardFeedback,
  BoardHeader,
  BoardPanel,
  StatusBadge,
  useBoardPolling
} from '../components/board-ui'
import type { BoardActionResult } from '../types'

export function BoardDecisionDetailPage({
  decision,
  votes,
  reports,
  sessionStatus,
  sessionPhase
}: {
  decision: BoardDecisionResDtoOutput
  votes: BoardVoteResDtoOutput[]
  reports: SeriesReportResDtoOutput[]
  sessionStatus: string
  sessionPhase: BoardSessionPhase
}) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  useBoardPolling()
  const canVote =
    sessionStatus === 'ACTIVE' &&
    sessionPhase === 'VOTING' &&
    (decision.result === 'PENDING' || decision.result === 'PENDING_QUORUM')
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader
        title={decision.decisionType ?? t('decisions.title')}
        description={`${t('decisions.series')}: ${decision.targetSeriesId ?? '—'}`}
      />
      <BoardPanel title={t('decisions.progress')}>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <StatusBadge value={decision.result ?? 'PENDING'} />
          <strong>
            {t('decisions.summary', {
              approve: decision.approveCount,
              reject: decision.rejectCount,
              total: decision.totalVotes
            })}
          </strong>
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
