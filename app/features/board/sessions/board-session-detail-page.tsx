import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Radio, Send, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BoardMessage, BoardSessionPhase } from '~/api/manual/board-meeting'
import type { BoardMeetingSession } from '~/api/manual/board-meeting'
import type { BoardDecisionResDtoOutput } from '~/api/model/board'
import { BoardHeader, BoardPanel, EmptyState, StatusBadge, useBoardPolling } from '../components/board-ui'
import { useSessionVoteProgress } from './use-session-vote-progress'

export function BoardSessionDetailPage({
  session,
  decisions,
  phase,
  messages
}: {
  session: BoardMeetingSession
  decisions: BoardDecisionResDtoOutput[]
  phase: BoardSessionPhase
  messages: BoardMessage[]
}) {
  const { t, i18n } = useTranslation('board')
  useBoardPolling()
  const meeting = useSessionVoteProgress({
    sessionId: session.id,
    decisions,
    initialPhase: phase,
    initialMessages: messages
  })
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader
        title={session.title}
        description={session.description || t('common.noDescription')}
        backHref='/dashboard/board/sessions'
      />
      <BoardPanel title={t('sessions.details')}>
        <div className={`grid gap-3 text-xs ${session.status === 'CONCLUDED' ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
          <div>
            <span className='text-muted-foreground'>{t('common.status')}</span>
            <div className='mt-1'>
              <StatusBadge value={session.status} />
            </div>
          </div>
          {session.status !== 'CONCLUDED' && (
            <div>
              <span className='text-muted-foreground'>{t('sessions.phase')}</span>
              <div className='mt-1'>
                <StatusBadge value={meeting.phase} />
              </div>
            </div>
          )}
          <div>
            <span className='text-muted-foreground'>{t('sessions.members')}</span>
            <p className='mt-1 font-bold'>{session.allowedEditorIds.length}</p>
          </div>
          <div>
            <span className='text-muted-foreground'>{t('sessions.start')}</span>
            <p className='mt-1 font-bold'>{new Date(session.startTime).toLocaleString(i18n.language)}</p>
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
              {member.displayName || t('sessions.unknownMember')}
            </span>
          ))}
        </div>
      </BoardPanel>
      <MeetingChat
        messages={meeting.messages}
        disabled={session.status !== 'ACTIVE' || meeting.phase !== 'QA'}
        connectionState={meeting.connectionState}
        sendMessage={meeting.sendMessage}
        creatorId={session.creatorId}
        allowedEditorIds={session.allowedEditorIds}
      />
      <BoardPanel title={t('decisions.title')}>
        <div className='mb-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground'>
          <Radio className={`size-4 ${meeting.connectionState === 'connected' ? 'text-primary' : ''}`} />
          {t(`sessions.realtime.${meeting.connectionState}`)}
        </div>
        <div className='grid gap-3'>
          {meeting.decisions.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} memberCount={session.allowedEditorIds.length} />
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
  sendMessage,
  creatorId,
  allowedEditorIds
}: {
  messages: BoardMessage[]
  disabled: boolean
  connectionState: 'connecting' | 'connected' | 'disconnected'
  sendMessage: (content: string) => Promise<{ status: string; reason?: string }>
  creatorId: string
  allowedEditorIds: string[]
}) {
  const { t, i18n } = useTranslation('board')
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

  const getSenderRole = (senderId: string) => {
    if (senderId === creatorId) return 'editor'
    if (allowedEditorIds.includes(senderId)) return 'boardMember'
    return 'unknown'
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'editor':
        return 'bg-primary/10 text-primary'
      case 'boardMember':
        return 'bg-secondary text-secondary-foreground'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <BoardPanel title={t('sessions.chat')}>
      <div className='mt-3 flex flex-wrap items-center gap-3 text-xs'>
        <span className='flex items-center gap-1.5'>
          <span className='rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary'>{t('sessions.senderRoles.editor')}</span>
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='rounded-full bg-secondary px-2 py-0.5 font-semibold text-secondary-foreground'>{t('sessions.senderRoles.boardMember')}</span>
        </span>
      </div>
      <div className='mt-4 max-h-80 space-y-3 overflow-y-auto rounded-lg bg-muted/40 p-3'>
        {messages.map((message) => {
          const role = getSenderRole(message.sender.id)
          const roleLabel = role === 'editor' ? t('sessions.senderRoles.editor') : role === 'boardMember' ? t('sessions.senderRoles.boardMember') : t('sessions.senderRoles.unknown')
          const roleClass = getRoleBadgeClass(role)

          return (
            <article key={message.id} className='rounded-lg border border-border bg-card p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <strong className='text-xs text-foreground'>
                    {message.sender.displayName || t('sessions.unknownMember')}
                  </strong>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${roleClass}`}>
                    {roleLabel}
                  </span>
                </div>
                <time className='text-xs text-muted-foreground'>{new Date(message.createdAt).toLocaleTimeString(i18n.language)}</time>
              </div>
              <p className='mt-2 whitespace-pre-wrap text-xs'>{message.content}</p>
            </article>
          )
        })}
        {!messages.length && (
          <p className='text-xs text-muted-foreground'>{t('sessions.emptyChat')}</p>
        )}
      </div>
      <form onSubmit={submit} className='mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={chatDisabled || sending}
          maxLength={1000}
          className='h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-xs disabled:opacity-50'
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

function DecisionCard({ decision, memberCount }: { decision: BoardDecisionResDtoOutput; memberCount: number }) {
  const { t } = useTranslation('board')
  const totalVotes = Math.min(decision.totalVotes, memberCount)
  const abstainCount = Math.max(totalVotes - decision.approveCount - decision.rejectCount, 0)
  const percentage = memberCount > 0 ? Math.min((totalVotes / memberCount) * 100, 100) : 0

  return (
    <Link
      to={`/dashboard/board/decisions/${decision.id}`}
      className='block rounded-lg border border-border p-4 transition-colors hover:border-primary'
    >
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <strong>
            {decision.decisionType ? t(`filters.decisionTypes.${decision.decisionType}`) : t('decisions.title')}
          </strong>
          <p className='mt-1 text-xs text-muted-foreground'>
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
    </Link>
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
