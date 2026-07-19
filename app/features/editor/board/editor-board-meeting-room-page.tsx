import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, MessageSquareText, Play, Radio, Send, Square, Users } from 'lucide-react'
import { Link, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'

import type { BoardDecisionResDtoOutput } from '~/api/model/board'
import type { BoardMeetingSession, BoardMessage, BoardSessionPhase } from '~/api/manual/board-meeting'
import { useAuth } from '~/features/auth/context/auth-context'
import type { EditorActionResult } from '../types'
import { orderBoardDecisions } from './board-order'
import { BoardFeedback, BoardStatus } from './components/board-shared'
import { useEditorMeetingRoom } from './hooks/use-editor-meeting-room'

export function EditorBoardMeetingRoomPage({
  session,
  phase: initialPhase,
  messages: initialMessages,
  decisions: initialDecisions,
  manageAll = false,
  backPath = '/dashboard/editor/board/sessions',
  decisionBasePath
}: {
  session: BoardMeetingSession
  phase: BoardSessionPhase
  messages: BoardMessage[]
  decisions: BoardDecisionResDtoOutput[]
  manageAll?: boolean
  backPath?: string
  decisionBasePath?: string
}) {
  const { t, i18n } = useTranslation('editor')
  const { session: authSession } = useAuth()
  const fetcher = useFetcher<EditorActionResult>()
  const [messageText, setMessageText] = useState('')
  const [chatError, setChatError] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const meeting = useEditorMeetingRoom({
    sessionId: session.id,
    initialPhase,
    initialMessages,
    initialDecisions
  })
  const { updatePhase } = meeting
  const isCreator = manageAll || session.creatorId === authSession?.user.id
  const canChat = session.status === 'ACTIVE' && meeting.phase !== 'VOTING'
  const allDecisionsFinal =
    meeting.decisions.length > 0 &&
    meeting.decisions.every((decision) => ['APPROVED', 'REJECTED', 'EXPIRED'].includes(decision.result ?? ''))

  useEffect(() => {
    if (fetcher.data?.ok && fetcher.data.intent === 'advancePhase' && fetcher.data.phase) {
      updatePhase(fetcher.data.phase)
    }
  }, [fetcher.data, updatePhase])

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = messageText.trim()
    if (!content || sendingMessage) return
    setSendingMessage(true)
    try {
      const ack = await meeting.sendMessage(content)
      if (ack.status === 'SUCCESS') {
        setMessageText('')
        setChatError('')
      } else setChatError(t(`board.meeting.chatErrors.${ack.reason ?? 'UNKNOWN'}`))
    } finally {
      setSendingMessage(false)
    }
  }

  return (
    <div className='space-y-6 pb-12'>
      <Link
        to={backPath}
        className='inline-flex items-center gap-2 text-sm font-bold text-primary'
      >
        <ArrowLeft className='size-4' />
        {t('board.back')}
      </Link>
      <header className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold text-foreground'>{session.title}</h1>
            <p className='mt-2 text-sm text-muted-foreground'>{session.description}</p>
          </div>
          <div className='flex gap-2'>
            <BoardStatus value={session.status} />
            <BoardStatus value={meeting.phase} />
          </div>
        </div>
        <div className='mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground'>
          <Radio className={`size-4 ${meeting.connectionState === 'connected' ? 'text-primary' : ''}`} />
          {t(`board.realtime.${meeting.connectionState}`)}
        </div>
        <div className='mt-4 border-t border-border pt-4'>
          <p className='flex items-center gap-2 text-sm font-bold text-foreground'>
            <Users className='size-4 text-primary' />
            {t('board.meeting.participants')}
          </p>
          <div className='mt-2 flex flex-wrap gap-2'>
            {(session.members ?? []).map((member) => (
              <span key={member.id} className='rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold'>
                {member.displayName || member.id}
              </span>
            ))}
          </div>
        </div>
      </header>

      {isCreator && session.status !== 'CONCLUDED' && (
        <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <h2 className='font-bold text-foreground'>{t('board.meeting.phaseControls')}</h2>
          <div className='mt-3 flex flex-wrap gap-2'>
            {session.status === 'UPCOMING' && (
              <fetcher.Form method='post'>
                <button
                  name='intent'
                  value='startSession'
                  disabled={fetcher.state !== 'idle' || meeting.decisions.length === 0}
                  className='inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50'
                >
                  <Play className='size-4' />
                  {t('actions.startSession')}
                </button>
              </fetcher.Form>
            )}
            {session.status === 'ACTIVE' && meeting.phase === 'PRESENTING' && (
              <fetcher.Form method='post'>
                <input type='hidden' name='intent' value='advancePhase' />
                <button
                  name='phase'
                  value='QA'
                  disabled={fetcher.state !== 'idle'}
                  className='rounded-md border border-border px-4 py-2 text-sm font-bold disabled:opacity-50'
                >
                  {t('board.meeting.openQa')}
                </button>
              </fetcher.Form>
            )}
            {session.status === 'ACTIVE' && meeting.phase === 'QA' && (
              <fetcher.Form method='post'>
                <input type='hidden' name='intent' value='advancePhase' />
                <button
                  name='phase'
                  value='VOTING'
                  disabled={fetcher.state !== 'idle'}
                  className='rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50'
                >
                  {t('board.meeting.openVoting')}
                </button>
              </fetcher.Form>
            )}
            {session.status === 'ACTIVE' && meeting.phase === 'VOTING' && allDecisionsFinal && (
              <fetcher.Form method='post'>
                <button
                  name='intent'
                  value='concludeSession'
                  disabled={fetcher.state !== 'idle'}
                  className='inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50'
                >
                  <Square className='size-4' />
                  {t('actions.concludeSession')}
                </button>
              </fetcher.Form>
            )}
          </div>
          {session.status === 'UPCOMING' && meeting.decisions.length === 0 && (
            <p className='mt-2 text-xs font-semibold text-muted-foreground'>{t('board.decisionRequiredBeforeStart')}</p>
          )}
          <BoardFeedback data={fetcher.data} />
        </section>
      )}

      <div className='grid gap-6 xl:grid-cols-[1.2fr_0.8fr]'>
        <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <h2 className='flex items-center gap-2 text-lg font-bold'>
            <MessageSquareText className='size-5 text-primary' />
            {t('board.meeting.chat')}
          </h2>
          <div className='mt-4 max-h-[28rem] space-y-3 overflow-y-auto rounded-lg bg-muted/40 p-3'>
            {meeting.messages.map((message) => (
              <article key={message.id} className='rounded-lg border border-border bg-card p-3'>
                <div className='flex justify-between gap-3 text-xs text-muted-foreground'>
                  <strong className='text-foreground'>{message.sender.displayName || message.sender.id}</strong>
                  <span>
                    {new Intl.DateTimeFormat(i18n.language, { timeStyle: 'short' }).format(new Date(message.createdAt))}
                  </span>
                </div>
                <p className='mt-2 whitespace-pre-wrap text-sm'>{message.content}</p>
              </article>
            ))}
            {!meeting.messages.length && (
              <p className='text-sm text-muted-foreground'>{t('board.meeting.emptyChat')}</p>
            )}
          </div>
          <form onSubmit={submitMessage} className='mt-3 flex gap-2'>
            <input
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              maxLength={1000}
              disabled={!canChat || meeting.connectionState !== 'connected' || sendingMessage}
              className='h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm'
              placeholder={canChat ? t('board.meeting.chatPlaceholder') : t('board.meeting.chatLocked')}
            />
            <button
              disabled={!canChat || meeting.connectionState !== 'connected' || sendingMessage || !messageText.trim()}
              className='rounded-md bg-primary px-3 text-primary-foreground disabled:opacity-50'
            >
              <Send className='size-4' />
            </button>
          </form>
          {chatError && <p className='mt-2 text-xs font-semibold text-destructive'>{chatError}</p>}
        </section>

        <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <h2 className='text-lg font-bold'>{t('board.votingProgress')}</h2>
          <div className='mt-4 space-y-3'>
            {orderBoardDecisions(meeting.decisions).map((decision) => (
              <article key={decision.id} className='rounded-lg border border-border p-3'>
                <div className='flex justify-between gap-2'>
                  {decisionBasePath ? (
                    <Link className='font-bold hover:text-primary hover:underline' to={`${decisionBasePath}/${decision.id}`}>
                      {decision.decisionType}
                    </Link>
                  ) : (
                    <strong>{decision.decisionType}</strong>
                  )}
                  <BoardStatus value={decision.result || 'PENDING'} />
                </div>
                <p className='mt-2 text-xs text-muted-foreground'>
                  {t('board.voteSummary', {
                    approve: decision.approveCount,
                    reject: decision.rejectCount,
                    total: decision.totalVotes
                  })}
                </p>
              </article>
            ))}
            {!meeting.decisions.length && <p className='text-sm text-muted-foreground'>{t('board.emptyDecisions')}</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
