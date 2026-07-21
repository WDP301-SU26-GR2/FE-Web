import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Radio, Send, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BoardMessage, BoardSessionPhase } from '~/api/manual/board-meeting'
import type { BoardMeetingSession } from '~/api/manual/board-meeting'
import type { BoardDecisionResDtoOutput } from '~/api/model/board'
import { BoardHeader, BoardPanel, EmptyState, StatusBadge, useBoardPolling } from '../components/board-ui'
import { SeriesMeetingBrief, type BoardMeetingSeriesBrief } from './components/series-meeting-brief'
import { useSessionVoteProgress } from './use-session-vote-progress'

export function BoardSessionDetailPage({
  session,
  decisions,
  phase,
  messages,
  seriesBriefs
}: {
  session: BoardMeetingSession
  decisions: BoardDecisionResDtoOutput[]
  phase: BoardSessionPhase
  messages: BoardMessage[]
  seriesBriefs: BoardMeetingSeriesBrief[]
}) {
  const { t } = useTranslation('board')
  useBoardPolling()
  const meeting = useSessionVoteProgress({
    sessionId: session.id,
    decisions,
    initialPhase: phase,
    initialMessages: messages
  })
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={session.title} description={session.description || t('common.noDescription')} />
      <BoardPanel title={t('sessions.details')}>
        <div className='grid gap-3 text-sm sm:grid-cols-4'>
          <div>
            <span className='text-muted-foreground'>{t('common.status')}</span>
            <div className='mt-1'>
              <StatusBadge value={session.status} />
            </div>
          </div>
          <div>
            <span className='text-muted-foreground'>{t('sessions.phase')}</span>
            <div className='mt-1'>
              <StatusBadge value={meeting.phase} />
            </div>
          </div>
          <div>
            <span className='text-muted-foreground'>{t('sessions.members')}</span>
            <p className='mt-1 font-bold'>{session.allowedEditorIds.length}</p>
          </div>
          <div>
            <span className='text-muted-foreground'>{t('sessions.start')}</span>
            <p className='mt-1 font-bold'>{new Date(session.startTime).toLocaleString()}</p>
          </div>
        </div>
      </BoardPanel>
      <BoardPanel title={t('sessions.participants')}>
        <div className='flex flex-wrap gap-2'>
          {(session.members ?? []).map((member) => (
            <span
              key={member.id}
              className='inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold'
            >
              <Users className='size-3.5 text-primary' />
              {member.displayName || member.id}
            </span>
          ))}
        </div>
      </BoardPanel>
      {seriesBriefs.length > 0 && (
        <BoardPanel title={t('sessions.seriesBrief.title')}>
          <p className='mb-4 text-sm text-muted-foreground'>{t('sessions.seriesBrief.description')}</p>
          <div className='grid gap-4'>
            {seriesBriefs.map((brief) => (
              <SeriesMeetingBrief key={brief.series.id} brief={brief} />
            ))}
          </div>
        </BoardPanel>
      )}
      <MeetingChat
        messages={meeting.messages}
        disabled={session.status !== 'ACTIVE' || meeting.phase === 'VOTING'}
        connectionState={meeting.connectionState}
        sendMessage={meeting.sendMessage}
      />
      <BoardPanel title={t('sessions.votingProgress')}>
        <div className='mb-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground'>
          <Radio className={`size-4 ${meeting.connectionState === 'connected' ? 'text-primary' : ''}`} />
          {t(`sessions.realtime.${meeting.connectionState}`)}
        </div>
        <div className='grid gap-4'>
          {meeting.decisions.map((decision) => (
            <DecisionProgress key={decision.id} decision={decision} memberCount={session.allowedEditorIds.length} />
          ))}
          {!meeting.decisions.length && <EmptyState text={t('decisions.empty')} />}
        </div>
      </BoardPanel>
      <BoardPanel title={t('decisions.title')}>
        <div className='grid gap-3'>
          {meeting.decisions.map((decision) => (
            <Link
              key={decision.id}
              to={`/dashboard/board/decisions/${decision.id}`}
              className='rounded-lg border border-border p-4 hover:border-primary'
            >
              <div className='flex justify-between gap-3'>
                <strong>{decision.decisionType ?? 'DECISION'}</strong>
                <StatusBadge value={decision.result ?? 'PENDING'} />
              </div>
              <p className='mt-2 text-sm text-muted-foreground'>
                {t('decisions.voteCount', { count: decision.totalVotes })}
              </p>
            </Link>
          ))}
          {!meeting.decisions.length && <EmptyState text={t('decisions.empty')} />}
        </div>
      </BoardPanel>
    </div>
  )
}

function MeetingChat({
  messages,
  disabled,
  connectionState,
  sendMessage
}: {
  messages: BoardMessage[]
  disabled: boolean
  connectionState: 'connecting' | 'connected' | 'disconnected'
  sendMessage: (content: string) => Promise<{ status: string; reason?: string }>
}) {
  const { t } = useTranslation('board')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const chatDisabled = disabled || connectionState !== 'connected'

  async function submit(event: FormEvent) {
    event.preventDefault()
    const value = content.trim()
    if (!value || chatDisabled || sending) return
    setSending(true)
    try {
      const result = await sendMessage(value)
      if (result.status === 'SUCCESS') {
        setContent('')
        setError('')
      } else setError(t(`sessions.chatErrors.${result.reason ?? 'UNKNOWN'}`))
    } finally {
      setSending(false)
    }
  }

  return (
    <BoardPanel title={t('sessions.chat')}>
      <div className='max-h-80 space-y-3 overflow-y-auto rounded-lg border border-border p-3'>
        {messages.map((message) => (
          <article key={message.id} className='rounded-md bg-muted p-3 text-sm'>
            <div className='flex justify-between gap-3 text-xs text-muted-foreground'>
              <strong className='text-foreground'>{message.sender.displayName ?? message.sender.id}</strong>
              <time>{new Date(message.createdAt).toLocaleTimeString()}</time>
            </div>
            <p className='mt-1 whitespace-pre-wrap'>{message.content}</p>
          </article>
        ))}
        {!messages.length && <EmptyState text={t('sessions.emptyChat')} />}
      </div>
      <form onSubmit={submit} className='mt-3 flex gap-2'>
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={chatDisabled || sending}
          maxLength={1000}
          className='h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm disabled:opacity-50'
          placeholder={chatDisabled ? t('sessions.chatLocked') : t('sessions.chatPlaceholder')}
        />
        <button
          disabled={chatDisabled || sending || !content.trim()}
          className='inline-flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50'
          aria-label={t('sessions.sendMessage')}
        >
          <Send className='size-4' />
        </button>
      </form>
      {error && <p className='mt-2 text-xs font-semibold text-destructive'>{error}</p>}
    </BoardPanel>
  )
}

function DecisionProgress({ decision, memberCount }: { decision: BoardDecisionResDtoOutput; memberCount: number }) {
  const { t } = useTranslation('board')
  const totalVotes = Math.min(decision.totalVotes, memberCount)
  const abstainCount = Math.max(totalVotes - decision.approveCount - decision.rejectCount, 0)
  const percentage = memberCount > 0 ? Math.min((totalVotes / memberCount) * 100, 100) : 0

  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <strong>{decision.decisionType ?? t('decisions.title')}</strong>
          <p className='mt-1 text-sm text-muted-foreground'>
            {t('sessions.votedMembers', { voted: totalVotes, total: memberCount })}
          </p>
        </div>
        <StatusBadge value={decision.result ?? 'PENDING'} />
      </div>
      <div className='mt-4 h-2 overflow-hidden rounded-full bg-muted'>
        <div
          className='h-full rounded-full bg-primary transition-[width] duration-300'
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className='mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4'>
        <ProgressMetric label={t('decisions.approve')} value={decision.approveCount} />
        <ProgressMetric label={t('decisions.reject')} value={decision.rejectCount} />
        <ProgressMetric label={t('decisions.abstain')} value={abstainCount} />
        <ProgressMetric
          label={t('sessions.quorum')}
          value={decision.quorumMet ? t('sessions.quorumMet') : t('sessions.quorumPending')}
        />
      </div>
    </article>
  )
}

function ProgressMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className='rounded-md bg-muted p-2'>
      <span className='block text-muted-foreground'>{label}</span>
      <strong className='mt-1 block text-foreground'>{value}</strong>
    </div>
  )
}
