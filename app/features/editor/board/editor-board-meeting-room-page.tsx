import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Gavel, Loader2, MessageSquareText, Play, Plus, Radio, Send, Square, Users } from 'lucide-react'
import { Link, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'

import { BoardSessionResDtoOutputStatus, type BoardDecisionResDtoOutput } from '~/api/model/board'
import type { BoardMeetingSession, BoardMessage, BoardSessionPhase } from '~/api/manual/board-meeting'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import type { TransferRequestListResDtoOutputDataItem } from '~/api/model/transfer'
import { useAuth } from '~/features/auth/context/auth-context'
import { Dialog } from '~/shared/ui/dialog'
import type { EditorActionResult } from '../types'
import { orderBoardDecisions } from './board-order'
import { BOARD_DECISION_LIMITS, BOARD_SESSION_INTENTS } from './board-session-flow'
import { boardInput, BoardFeedback, BoardStatus, useBoardFetcher } from './components/board-shared'
import { useEditorMeetingRoom } from './hooks/use-editor-meeting-room'

export function EditorBoardMeetingRoomPage({
  session,
  phase: initialPhase,
  messages: initialMessages,
  decisions: initialDecisions,
  series,
  contractResources = [],
  transferRequests = [],
  manageAll = false,
  allowChat = true,
  backPath = '/dashboard/editor/board/sessions',
  decisionBasePath = '/dashboard/editor/board/decisions'
}: {
  session: BoardMeetingSession
  phase: BoardSessionPhase
  messages: BoardMessage[]
  decisions: BoardDecisionResDtoOutput[]
  series: SeriesListResDtoOutputItemsItem[]
  contractResources?: BoardDecisionResourceOption[]
  transferRequests?: TransferRequestListResDtoOutputDataItem[]
  manageAll?: boolean
  allowChat?: boolean
  backPath?: string
  decisionBasePath?: string
}) {
  const { t, i18n } = useTranslation('editor')
  const { session: authSession } = useAuth()
  const fetcher = useFetcher<EditorActionResult>()
  const [messageText, setMessageText] = useState('')
  const [chatError, setChatError] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [addDecisionOpen, setAddDecisionOpen] = useState(false)
  const meeting = useEditorMeetingRoom({
    sessionId: session.id,
    initialPhase,
    initialMessages,
    initialDecisions
  })
  const { updatePhase } = meeting
  const isCreator = manageAll || session.creatorId === authSession?.user.id
  const canChat = allowChat && session.status === BoardSessionResDtoOutputStatus.ACTIVE && meeting.phase !== 'VOTING'
  const canPrepareSession =
    isCreator &&
    (session.status === BoardSessionResDtoOutputStatus.UPCOMING ||
      (session.status === BoardSessionResDtoOutputStatus.ACTIVE && meeting.phase === 'PRESENTING'))

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
      <Link to={backPath} className='inline-flex items-center gap-2 text-xs font-bold text-primary'>
        <ArrowLeft className='size-4' />
        {t('board.back')}
      </Link>
      <header className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold text-foreground'>{session.title}</h1>
            <p className='mt-2 text-xs text-muted-foreground'>{session.description}</p>
          </div>
          <div className='flex flex-wrap justify-end gap-2'>
            <BoardStatus value={session.status} />
            {session.status !== BoardSessionResDtoOutputStatus.CONCLUDED && <BoardStatus value={meeting.phase} />}
          </div>
        </div>
        <div className='mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground'>
          <Radio className={`size-4 ${meeting.connectionState === 'connected' ? 'text-primary' : ''}`} />
          {t(`board.realtime.${meeting.connectionState}`)}
        </div>
        <div className='mt-4 border-t border-border pt-4'>
          <p className='flex items-center gap-2 text-xs font-bold text-foreground'>
            <Users className='size-4 text-primary' />
            {t('board.meeting.participants')}
          </p>
          <div className='mt-2 flex flex-wrap gap-2'>
            {(session.members ?? []).map((member) => (
              <span
                key={member.id}
                className='rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold'
              >
                {member.displayName || member.id}
              </span>
            ))}
          </div>
        </div>
      </header>

      {isCreator && session.status !== BoardSessionResDtoOutputStatus.CONCLUDED && (
        <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <h2 className='font-bold text-foreground'>{t('board.meeting.phaseControls')}</h2>
          <div className='mt-3 flex flex-wrap gap-2'>
            {session.status === BoardSessionResDtoOutputStatus.UPCOMING && (
              <fetcher.Form method='post'>
                <button
                  name='intent'
                  value={BOARD_SESSION_INTENTS.start}
                  disabled={fetcher.state !== 'idle'}
                  className='inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50'
                >
                  <Play className='size-4' />
                  {t('actions.startSession')}
                </button>
              </fetcher.Form>
            )}
            {session.status === BoardSessionResDtoOutputStatus.ACTIVE && meeting.phase === 'PRESENTING' && (
              <fetcher.Form method='post'>
                <input type='hidden' name='intent' value='advancePhase' />
                <button
                  name='phase'
                  value='QA'
                  disabled={fetcher.state !== 'idle'}
                  className='rounded-md border border-border px-4 py-2 text-xs font-bold disabled:opacity-50'
                >
                  {t('board.meeting.openQa')}
                </button>
              </fetcher.Form>
            )}
            {session.status === BoardSessionResDtoOutputStatus.ACTIVE && meeting.phase === 'QA' && (
              <fetcher.Form method='post'>
                <input type='hidden' name='intent' value='advancePhase' />
                <button
                  name='phase'
                  value='VOTING'
                  disabled={fetcher.state !== 'idle'}
                  className='rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50'
                >
                  {t('board.meeting.openVoting')}
                </button>
              </fetcher.Form>
            )}
            {session.status === BoardSessionResDtoOutputStatus.ACTIVE && (
              <fetcher.Form method='post'>
                <button
                  name='intent'
                  value={BOARD_SESSION_INTENTS.conclude}
                  disabled={fetcher.state !== 'idle'}
                  className='inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50'
                >
                  <Square className='size-4' />
                  {t('actions.concludeSession')}
                </button>
              </fetcher.Form>
            )}
          </div>
          <BoardFeedback data={fetcher.data} />
        </section>
      )}

      <div className='space-y-6'>
        <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <h2 className='flex items-center gap-2 text-base font-bold'>
            <MessageSquareText className='size-5 text-primary' />
            {t('board.meeting.chat')}
          </h2>
          <div className='mt-4 max-h-[28rem] space-y-3 overflow-y-auto rounded-lg bg-muted/40 p-3'>
            {meeting.messages.map((message) => (
              <article key={message.id} className='rounded-lg border border-border bg-card p-3'>
                <div className='flex justify-between gap-3 text-xs text-muted-foreground'>
                  <strong className='text-foreground'>
                    {message.sender.displayName || t('board.meeting.unknownMember')}
                  </strong>
                  <span>
                    {new Intl.DateTimeFormat(i18n.language, { timeStyle: 'short' }).format(new Date(message.createdAt))}
                  </span>
                </div>
                <p className='mt-2 whitespace-pre-wrap text-xs'>{message.content}</p>
              </article>
            ))}
            {!meeting.messages.length && (
              <p className='text-xs text-muted-foreground'>{t('board.meeting.emptyChat')}</p>
            )}
          </div>
          <form onSubmit={submitMessage} className='mt-3 flex gap-2'>
            <input
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              maxLength={1000}
              disabled={!canChat || meeting.connectionState !== 'connected' || sendingMessage}
              className='h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-xs'
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
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h2 className='text-base font-bold'>{t('board.decisionList')}</h2>
              <p className='mt-1 text-xs text-muted-foreground'>{t('board.meeting.decisionAgendaHint')}</p>
            </div>
            {canPrepareSession && (
              <button
                type='button'
                onClick={() => setAddDecisionOpen(true)}
                disabled={!series.length}
                className='inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50'
              >
                <Plus className='size-4' />
                {t('actions.addDecisionToSession')}
              </button>
            )}
          </div>
          <div className='mt-4 space-y-3'>
            {orderBoardDecisions(meeting.decisions).map((decision) => (
              <article key={decision.id} className='rounded-lg border border-border p-3'>
                <div className='flex items-start justify-between gap-3'>
                  {decisionBasePath ? (
                    <Link
                      className='min-w-0 text-pretty font-bold leading-6 hover:text-primary hover:underline'
                      to={`${decisionBasePath}/${decision.id}`}
                    >
                      {getDecisionTitle(decision, t)}
                    </Link>
                  ) : (
                    <strong className='min-w-0 text-pretty leading-6'>{getDecisionTitle(decision, t)}</strong>
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
            {!meeting.decisions.length && <p className='text-xs text-muted-foreground'>{t('board.emptyDecisions')}</p>}
            {canPrepareSession && !series.length && (
              <p className='text-xs text-muted-foreground'>{t('board.meeting.noEligibleSeries')}</p>
            )}
          </div>
        </section>
      </div>
      {addDecisionOpen && (
        <AddSessionDecisionDialog
          series={series}
          decisions={meeting.decisions}
          contractResources={contractResources}
          transferRequests={transferRequests}
          onDecisionCreated={meeting.addDecision}
          onAdded={meeting.refreshDecisions}
          onClose={() => setAddDecisionOpen(false)}
        />
      )}
    </div>
  )
}

function AddSessionDecisionDialog({
  series,
  decisions,
  contractResources,
  transferRequests,
  onDecisionCreated,
  onAdded,
  onClose
}: {
  series: SeriesListResDtoOutputItemsItem[]
  decisions: BoardDecisionResDtoOutput[]
  contractResources: BoardDecisionResourceOption[]
  transferRequests: TransferRequestListResDtoOutputDataItem[]
  onDecisionCreated: (decision: BoardDecisionResDtoOutput) => void
  onAdded: () => Promise<void>
  onClose: () => void
}) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()
  const [decisionType, setDecisionType] = useState('SERIALIZATION')
  const [seriesId, setSeriesId] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [transferRequestId, setTransferRequestId] = useState('')
  const eligibleStatuses = decisionType === 'SERIALIZATION' ? ['PITCHED'] : ['SERIALIZED', 'HIATUS']
  const eligibleSeries = series.filter(
    (item) => eligibleStatuses.includes(item.status) && !hasDecisionConflict(decisions, item.id, decisionType)
  )
  const selectedSeries = eligibleSeries.find((item) => item.id === seriesId)

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok && fetcher.data.intent === 'addSessionDecision') {
      if (fetcher.data.decision) onDecisionCreated(fetcher.data.decision)
      void onAdded()
      onClose()
    }
  }, [fetcher.data, fetcher.state, onAdded, onClose, onDecisionCreated])

  return (
    <Dialog
      compact
      open
      onClose={onClose}
      titleId='add-decision-to-board-session'
      title={t('board.meeting.addDecisionTitle')}
      description={t('board.meeting.addDecisionDescription')}
      size='lg'
    >
      <fetcher.Form method='post' className='grid gap-4'>
        <input type='hidden' name='intent' value='addSessionDecision' />
        <label className='grid gap-1.5 text-xs font-semibold'>
          {t('board.decisionType')}
          <select
            className={boardInput}
            name='decisionType'
            value={decisionType}
            onChange={(event) => {
              setDecisionType(event.target.value)
              setSeriesId('')
              setResourceId('')
              setTransferRequestId('')
            }}
          >
            <option value='SERIALIZATION'>{t('board.decisionTypeLabels.SERIALIZATION')}</option>
            <option value='CONTINUE'>{t('board.decisionTypeLabels.CONTINUE')}</option>
            <option value='HIATUS'>{t('board.decisionTypeLabels.HIATUS')}</option>
            <option value='CANCELLATION'>{t('board.decisionTypeLabels.CANCELLATION')}</option>
            <option value='CANCEL'>{t('board.decisionTypeLabels.CANCEL')}</option>
            <option value='ENDING_ALLOWANCE'>{t('board.decisionTypeLabels.ENDING_ALLOWANCE')}</option>
            <option value='FORMAT_CHANGE'>{t('board.decisionTypeLabels.FORMAT_CHANGE')}</option>
            <option value='COMPLETION'>{t('board.decisionTypeLabels.COMPLETION')}</option>
            <option value='SERIES_CONTRACT_APPROVAL'>{t('board.decisionTypeLabels.SERIES_CONTRACT_APPROVAL')}</option>
            <option value='CONTRACT'>{t('board.decisionTypeLabels.CONTRACT')}</option>
            <option value='REPRINT'>{t('board.decisionTypeLabels.REPRINT')}</option>
            <option value='TRANSFER'>{t('board.decisionTypeLabels.TRANSFER')}</option>
          </select>
        </label>
        {decisionType === 'CONTRACT' && (
          <label className='grid gap-1.5 text-xs font-semibold'>
            {t('board.contractResource')}
            <select
              className={boardInput}
              name='resourceId'
              required
              value={resourceId}
              onChange={(event) => {
                const resource = contractResources.find((item) => item.resourceId === event.target.value)
                setResourceId(event.target.value)
                setSeriesId(resource?.seriesId ?? '')
              }}
            >
              <option value='' disabled>
                {t('board.selectContractResource')}
              </option>
              {contractResources.map((resource) => (
                <option key={`${resource.resourceType}-${resource.resourceId}`} value={resource.resourceId}>
                  {resource.label}
                </option>
              ))}
            </select>
            {resourceId && (
              <>
                <input
                  type='hidden'
                  name='resourceType'
                  value={contractResources.find((item) => item.resourceId === resourceId)?.resourceType ?? ''}
                />
                <input
                  type='hidden'
                  name='versionId'
                  value={contractResources.find((item) => item.resourceId === resourceId)?.versionId ?? ''}
                />
              </>
            )}
          </label>
        )}
        {decisionType === 'TRANSFER' && (
          <label className='grid gap-1.5 text-xs font-semibold'>
            {t('board.transferRequest')}
            <select
              className={boardInput}
              name='transferRequestId'
              required
              value={transferRequestId}
              onChange={(event) => {
                const transferRequest = transferRequests.find((item) => item.id === event.target.value)
                setTransferRequestId(event.target.value)
                setSeriesId(transferRequest?.seriesId ?? '')
              }}
            >
              <option value='' disabled>
                {t('board.selectTransferRequest')}
              </option>
              {transferRequests
                .filter((item) => item.status === 'SUBMITTED')
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.series?.title ?? item.seriesId} · {item.id}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className='grid gap-1.5 text-xs font-semibold'>
          {t('board.selectSeries')}
          <select
            className={boardInput}
            name='seriesId'
            required
            value={seriesId}
            onChange={(event) => setSeriesId(event.target.value)}
            disabled={decisionType === 'CONTRACT' || decisionType === 'TRANSFER'}
          >
            <option value='' disabled>
              {t('board.selectSeries')}
            </option>
            {eligibleSeries.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {t(`filters.seriesStatuses.${item.status}`)}
              </option>
            ))}
          </select>
        </label>
        {selectedSeries && (
          <div className='rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground'>
            {t('board.meeting.willCreateSelectedDecision')}
          </div>
        )}
        {!eligibleSeries.length && (
          <p className='rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground'>
            {t('board.meeting.noSeriesForDecisionType')}
          </p>
        )}
        {decisionType === 'SERIALIZATION' && (
          <>
            <label className='grid gap-1.5 text-xs font-semibold'>
              {t('board.magazine')}
              <input className={boardInput} name='magazine' required disabled={!selectedSeries} />
            </label>
            <div className='grid gap-3 sm:grid-cols-2'>
              <label className='grid gap-1.5 text-xs font-semibold'>
                {t('board.startIssue')}
                <input
                  className={boardInput}
                  name='startIssueNumber'
                  type='number'
                  min={1}
                  max={BOARD_DECISION_LIMITS.startIssueMaximum}
                  step={1}
                  required
                  disabled={!selectedSeries}
                />
              </label>
              <PublicationTypeField selectedSeries={selectedSeries} />
            </div>
          </>
        )}
        {(decisionType === 'CANCELLATION' || decisionType === 'ENDING_ALLOWANCE') && (
          <label className='grid gap-1.5 text-xs font-semibold'>
            {t('board.endingChapterAllowance')}
            <input
              className={boardInput}
              name='endingChapterAllowance'
              type='number'
              min={1}
              max={10}
              disabled={!selectedSeries}
            />
          </label>
        )}
        {decisionType === 'FORMAT_CHANGE' && (
          <label className='grid gap-1.5 text-xs font-semibold'>
            {t('board.newPublicationType')}
            <select
              className={boardInput}
              name='publicationType'
              required
              defaultValue='WEEKLY'
              disabled={!selectedSeries}
            >
              <option value='WEEKLY'>{t('board.publicationTypes.weekly')}</option>
              <option value='MONTHLY'>{t('board.publicationTypes.monthly')}</option>
              <option value='IRREGULAR'>{t('board.publicationTypes.irregular')}</option>
            </select>
          </label>
        )}
        {decisionType !== 'SERIALIZATION' && (
          <label className='grid gap-1.5 text-xs font-semibold'>
            {t('board.decisionNote')}
            <textarea className={`${boardInput} min-h-24 py-2`} name='decisionNote' maxLength={1000} />
          </label>
        )}
        <div className='flex justify-end gap-2 border-t border-border pt-4'>
          <button
            type='button'
            onClick={onClose}
            className='h-10 rounded-md border border-border px-4 text-xs font-bold'
          >
            {t('actions.cancel')}
          </button>
          <button
            disabled={!selectedSeries || fetcher.state !== 'idle'}
            className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'
          >
            {fetcher.state !== 'idle' ? <Loader2 className='size-4 animate-spin' /> : <Gavel className='size-4' />}
            {t('actions.addDecisionToSession')}
          </button>
        </div>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </Dialog>
  )
}

interface BoardDecisionResourceOption {
  resourceType: 'PUBLICATION_CONTRACT' | 'REPLACEMENT_CONTRACT' | 'TRANSFER_CONTRACT' | 'CONTRACT_AMENDMENT'
  resourceId: string
  versionId: string
  seriesId: string
  label: string
}

function hasDecisionConflict(decisions: BoardDecisionResDtoOutput[], seriesId: string, decisionType: string) {
  const endingTypes = new Set(['COMPLETION', 'CANCELLATION', 'CANCEL'])
  return decisions.some(
    (decision) =>
      decision.targetSeriesId === seriesId &&
      (decision.decisionType === decisionType ||
        (endingTypes.has(decision.decisionType ?? '') && endingTypes.has(decisionType)))
  )
}

function PublicationTypeField({ selectedSeries }: { selectedSeries?: SeriesListResDtoOutputItemsItem }) {
  const { t } = useTranslation('editor')
  return (
    <label className='grid gap-1.5 text-xs font-semibold'>
      {t('proposalDetail.publicationType')}
      <select
        key={selectedSeries?.id ?? 'empty'}
        className={boardInput}
        name='publicationType'
        required
        defaultValue={selectedSeries?.publicationType ?? 'WEEKLY'}
        disabled={!selectedSeries}
      >
        <option value='WEEKLY'>{t('board.publicationTypes.weekly')}</option>
        <option value='MONTHLY'>{t('board.publicationTypes.monthly')}</option>
        <option value='IRREGULAR'>{t('board.publicationTypes.irregular')}</option>
      </select>
    </label>
  )
}

function getDecisionTitle(decision: BoardDecisionResDtoOutput, t: ReturnType<typeof useTranslation<'editor'>>['t']) {
  const type = t(`board.decisionTypeLabels.${decision.decisionType}`, {
    defaultValue: t('common.notAvailable')
  })
  if (!decision.targetSeries?.title) return type
  return decision.decisionType === 'SERIALIZATION'
    ? t('board.decisionDisplay.serializationTitle', { series: decision.targetSeries.title })
    : t('board.decisionDisplay.genericTitle', { type, series: decision.targetSeries.title })
}
