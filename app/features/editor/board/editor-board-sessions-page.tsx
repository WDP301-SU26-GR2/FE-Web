import { useEffect, useState } from 'react'
import { CalendarClock, CircleAlert, Loader2, Play, Plus, Radio, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import {
  BoardSessionResDtoOutputStatus,
  type BoardDecisionResDtoOutput,
  type BoardConfigResDtoOutput,
  type BoardSessionResDtoOutput
} from '~/api/model/board'
import { boardControllerSuggestMembers } from '~/api/operations/board/board'
import type { SuggestBoardMembersResDtoOutputItemsItem } from '~/api/model/board'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { useAuth } from '~/features/auth/context/auth-context'
import { Dialog } from '~/shared/ui/dialog'
import { orderBoardDecisions, orderBoardSessions } from './board-order'
import { BOARD_SESSION_INTENTS, BOARD_SESSION_FIELD_LIMITS, isValidBoardSessionTimeRange } from './board-session-flow'
import {
  boardInput,
  boardDialogButton,
  BoardFeedback,
  BoardPageLayout,
  BoardPanel,
  BoardStatus,
  useBoardAutoRefresh,
  useBoardFetcher
} from './components/board-shared'
import { useEditorSessionVoteProgress } from './hooks/use-editor-session-vote-progress'

const sessionFieldClass = 'grid min-w-0 grid-rows-[2.5rem_auto] gap-1.5 text-xs font-semibold'
const sessionFieldLabelClass = 'flex min-h-10 items-end leading-5 text-foreground'

export function EditorBoardSessionsPage({
  series,
  sessions,
  decisions,
  boardConfig,
  hasError,
  manageAll = false,
  hideCreateButton = false,
  backPath = '/dashboard/editor/board',
  detailBasePath = '/dashboard/editor/board/sessions'
}: {
  series: SeriesListResDtoOutputItemsItem[]
  sessions: BoardSessionResDtoOutput[]
  decisions: BoardDecisionResDtoOutput[]
  boardConfig: BoardConfigResDtoOutput | null
  hasError: boolean
  manageAll?: boolean
  hideCreateButton?: boolean
  backPath?: string
  detailBasePath?: string
}) {
  const { t } = useTranslation('editor')
  const { session: authSession } = useAuth()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [rosterSourceSeriesId, setRosterSourceSeriesId] = useState('')
  const [sessionSearch, setSessionSearch] = useState('')
  const [sessionStatus, setSessionStatus] = useState('')
  useBoardAutoRefresh()
  const currentUserId = authSession?.user.id ?? ''
  const visibleSessions = sessions
  const visibleSessionIds = new Set(visibleSessions.map((session) => session.id))
  const visibleDecisions = decisions.filter((decision) => visibleSessionIds.has(decision.boardSessionId))
  const voteProgress = useEditorSessionVoteProgress(visibleSessions, visibleDecisions)
  const filteredSessions = orderBoardSessions(
    visibleSessions.filter(
      (session) =>
        (!sessionStatus || session.status === sessionStatus) &&
        (!sessionSearch || session.title.toLowerCase().includes(sessionSearch.toLowerCase()))
    )
  )

  return (
    <BoardPageLayout
      titleKey='board.sections.sessions'
      descriptionKey='board.sectionDescriptions.sessions'
      hasError={hasError}
      backPath={backPath}
    >
<<<<<<< HEAD
      <div className='flex justify-end'>
        <button
          type='button'
          onClick={() => {
            const randomSeries = series[Math.floor(Math.random() * series.length)]
            setRosterSourceSeriesId(randomSeries?.id ?? '')
            setCreateDialogOpen(true)
          }}
          className={`${boardDialogButton} gap-2 bg-primary text-primary-foreground`}
        >
          <Plus className='size-4' />
          {t('actions.createSession')}
        </button>
      </div>
=======
      {!hideCreateButton && (
        <div className='flex justify-end'>
          <button
            type='button'
            onClick={() => {
              const randomSeries = series[Math.floor(Math.random() * series.length)]
              setRosterSourceSeriesId(randomSeries?.id ?? '')
              setCreateDialogOpen(true)
            }}
            className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'
          >
            <Plus className='size-4' />
            {t('actions.createSession')}
          </button>
        </div>
      )}
>>>>>>> cef4f21789faf7511d8522666f5db7065d0b67bd
      <BoardPanel title={t('board.sessions')}>
        <div className='grid gap-3'>
          <div className='grid gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-2'>
            <input
              className={boardInput}
              value={sessionSearch}
              onChange={(event) => setSessionSearch(event.target.value)}
              placeholder={t('board.filters.searchSessions')}
            />
            <select
              className={boardInput}
              value={sessionStatus}
              onChange={(event) => setSessionStatus(event.target.value)}
            >
              <option value=''>{t('board.filters.allStatuses')}</option>
              {Object.values(BoardSessionResDtoOutputStatus).map((status) => (
                <option key={status} value={status}>
                  {t(`board.sessionStatuses.${status}`)}
                </option>
              ))}
            </select>
          </div>
          {!!visibleSessions.some((session) => session.status === BoardSessionResDtoOutputStatus.ACTIVE) && (
            <div className='flex items-center gap-2 text-xs font-semibold text-muted-foreground'>
              <Radio className={`size-4 ${voteProgress.connectionState === 'connected' ? 'text-primary' : ''}`} />
              {t(`board.realtime.${voteProgress.connectionState}`)}
            </div>
          )}
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              decisions={voteProgress.decisions.filter((decision) => decision.boardSessionId === session.id)}
              currentUserId={currentUserId}
              manageAll={manageAll}
              detailBasePath={detailBasePath}
            />
          ))}
          {!filteredSessions.length && <p className='text-xs text-muted-foreground'>{t('board.emptySessions')}</p>}
        </div>
      </BoardPanel>
      {createDialogOpen && (
        <CreateSessionDialog
          rosterSourceSeriesId={rosterSourceSeriesId}
          boardConfig={boardConfig}
          onClose={() => setCreateDialogOpen(false)}
        />
      )}
    </BoardPageLayout>
  )
}

function CreateSessionDialog({
  rosterSourceSeriesId,
  boardConfig,
  onClose
}: {
  rosterSourceSeriesId: string
  boardConfig: BoardConfigResDtoOutput | null
  onClose: () => void
}) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [suggestedMembers, setSuggestedMembers] = useState<SuggestBoardMembersResDtoOutputItemsItem[]>([])
  const [suggestMembersFailed, setSuggestMembersFailed] = useState(false)
  const [loadingSuggested, setLoadingSuggested] = useState(true)
  const timeRangeIsValid = isValidBoardSessionTimeRange(startTime, endTime || undefined)
  const rosterSize = getRequiredRosterSize(boardConfig, suggestedMembers.length)
  const selectedCount = selectedMemberIds.length
  const rosterIsValid = rosterSize > 0 && selectedCount === rosterSize && !loadingSuggested
  const canSelectMoreMembers = selectedCount < rosterSize

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  useEffect(() => {
    if (!rosterSourceSeriesId) return
    let active = true
    boardControllerSuggestMembers({ seriesId: rosterSourceSeriesId })
      .then((res) => {
        if (!active) return
        setSuggestedMembers(res.data?.items ?? [])
      })
      .catch(() => {
        if (active) setSuggestMembersFailed(true)
      })
      .finally(() => {
        if (active) setLoadingSuggested(false)
      })
    return () => {
      active = false
    }
  }, [rosterSourceSeriesId])

  function toggleMember(memberId: string) {
    setSelectedMemberIds((current) => {
      if (current.includes(memberId)) return current.filter((id) => id !== memberId)
      if (current.length >= rosterSize) return current
      return [...current, memberId]
    })
  }

  return (
    <Dialog
      compact
      open
      onClose={onClose}
      titleId='create-board-session-title'
      descriptionId='create-board-session-description'
      title={t('board.sessionTitle')}
      description={t('board.sessionDescription')}
      size='xl'
      className='max-w-4xl'
    >
      <fetcher.Form method='post' className='grid gap-4'>
        <input type='hidden' name='intent' value={BOARD_SESSION_INTENTS.create} />
        <input type='hidden' name='seriesId' value={rosterSourceSeriesId} />
        <aside className='rounded-lg border border-border bg-muted p-3 text-foreground'>
          <div className='flex items-center gap-2 text-xs font-bold'>
            <CircleAlert className='size-4 shrink-0' />
            {t('board.sessionRulesTitle')}
          </div>
          <p className='mt-2 text-xs leading-5'>
            {t('board.sessionManualRosterNotice', {
              required: rosterSize || 0,
              total: boardConfig?.boardTotalMembers ?? suggestedMembers.length
            })}
          </p>
        </aside>
        {!rosterSourceSeriesId && (
          <p className='rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground'>
            {t('board.noSeriesForAutomaticRoster')}
          </p>
        )}
        <label className={sessionFieldClass}>
          <span className={sessionFieldLabelClass}>{t('board.sessionName')}</span>
          <input
            className={boardInput}
            name='title'
            minLength={BOARD_SESSION_FIELD_LIMITS.titleMinLength}
            maxLength={BOARD_SESSION_FIELD_LIMITS.titleMaxLength}
            required
          />
        </label>
        <div className='grid min-w-0 gap-3'>
          <label className={sessionFieldClass}>
            <span className={sessionFieldLabelClass}>{t('board.startTime')}</span>
            <input
              className={`${boardInput} min-w-0 [color-scheme:light] dark:[color-scheme:dark]`}
              name='startTime'
              type='datetime-local'
              required
              value={startTime}
              onChange={(event) => {
                const nextStartTime = event.target.value
                setStartTime(nextStartTime)
                if (endTime && endTime <= nextStartTime) setEndTime('')
              }}
            />
          </label>
          <label className={sessionFieldClass}>
            <span className={sessionFieldLabelClass}>{t('board.endTime')}</span>
            <input
              className={`${boardInput} min-w-0 [color-scheme:light] dark:[color-scheme:dark]`}
              name='endTime'
              type='datetime-local'
              min={startTime || undefined}
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </label>
        </div>
        <label className={sessionFieldClass}>
          <span className={sessionFieldLabelClass}>{t('board.sessionNote')}</span>
          <textarea
            className={`${boardInput} min-h-24 py-2`}
            name='description'
            maxLength={BOARD_SESSION_FIELD_LIMITS.descriptionMaxLength}
          />
        </label>
        <section className='grid gap-3 rounded-lg border border-border p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div>
              <h3 className='text-sm font-bold text-foreground'>{t('board.selectBoardMembers')}</h3>
              <p className='mt-1 text-xs text-muted-foreground'>
                {t('board.selectedBoardMembers', { selected: selectedCount, required: rosterSize || 0 })}
              </p>
            </div>
            {rosterIsValid ? (
              <span className='rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success'>
                {t('board.rosterValid')}
              </span>
            ) : (
              <span className='rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-bold text-warning-foreground'>
                {t('board.rosterNeedsSelection')}
              </span>
            )}
          </div>
          {suggestMembersFailed && (
            <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive'>
              {t('board.boardMembersLoadFailed')}
            </p>
          )}
          {!suggestMembersFailed && rosterSize > suggestedMembers.length && (
            <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive'>
              {t('board.notEnoughBoardMembers', { required: rosterSize, total: suggestedMembers.length })}
            </p>
          )}
          <div className='grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2'>
            {suggestedMembers.map((member) => {
              const checked = selectedMemberIds.includes(member.userId)
              const disabled = !checked && !canSelectMoreMembers
              return (
                <label
                  key={member.userId}
                  className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 text-xs transition-colors ${
                    checked ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  } ${disabled ? 'opacity-60' : ''}`}
                >
                  <input
                    type='checkbox'
                    name='allowedEditorIds'
                    value={member.userId}
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleMember(member.userId)}
                    className='mt-1 size-4 accent-primary'
                  />
                  <span className='min-w-0'>
                    <span className='block truncate font-bold text-foreground'>
                      {member.displayName || member.userId.slice(-5) || t('board.unnamedBoardMember')}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
          {!suggestedMembers.length && !suggestMembersFailed && !loadingSuggested && (
            <p className='rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground'>
              {t('board.emptyBoardMembers')}
            </p>
          )}
        </section>
        <div className='flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end'>
          <button
            type='button'
            onClick={onClose}
            disabled={fetcher.state !== 'idle'}
            className={`${boardDialogButton} border border-border text-foreground hover:bg-muted disabled:opacity-50`}
          >
            {t('actions.cancel')}
          </button>
          <button
            disabled={fetcher.state !== 'idle' || !rosterSourceSeriesId || !timeRangeIsValid || !rosterIsValid}
            className={`${boardDialogButton} gap-2 bg-primary text-primary-foreground disabled:opacity-50`}
          >
            {fetcher.state !== 'idle' ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <CalendarClock className='size-4' />
            )}
            {t('actions.createSession')}
          </button>
        </div>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </Dialog>
  )
}

function getRequiredRosterSize(config: BoardConfigResDtoOutput | null, availableMembers: number) {
  const configuredTotal = config?.boardTotalMembers ?? availableMembers
  const maximum = Math.max(0, Math.min(configuredTotal, availableMembers))
  if (maximum < 3) return 0
  const configuredSize = Math.max(3, config?.quorumMin ?? 3)
  const oddConfiguredSize = configuredSize % 2 === 0 ? configuredSize + 1 : configuredSize
  const cappedSize = Math.min(oddConfiguredSize, maximum)
  return cappedSize % 2 === 0 ? cappedSize - 1 : cappedSize
}

function SessionCard({
  session,
  decisions,
  currentUserId,
  manageAll,
  detailBasePath
}: {
  session: BoardSessionResDtoOutput
  decisions: BoardDecisionResDtoOutput[]
  currentUserId: string
  manageAll: boolean
  detailBasePath: string
}) {
  const { t, i18n } = useTranslation('editor')
  const fetcher = useBoardFetcher()
  const isCreator = session.creatorId === currentUserId
  const canManage = isCreator || manageAll
  const intent =
    session.status === BoardSessionResDtoOutputStatus.UPCOMING
      ? BOARD_SESSION_INTENTS.start
      : BOARD_SESSION_INTENTS.conclude
  const showStateAction =
    canManage &&
    (session.status === BoardSessionResDtoOutputStatus.UPCOMING ||
      session.status === BoardSessionResDtoOutputStatus.ACTIVE)

  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          {isCreator || manageAll ? (
            <Link to={`${detailBasePath}/${session.id}`} className='font-bold text-primary hover:underline'>
              {session.title}
            </Link>
          ) : (
            <h3 className='font-bold text-foreground'>{session.title}</h3>
          )}
          <p className='mt-1 text-xs text-muted-foreground'>
            {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
              new Date(session.startTime)
            )}
          </p>
        </div>
        <BoardStatus value={session.status} />
      </div>
      {session.description && <p className='mt-3 text-xs text-muted-foreground'>{session.description}</p>}
      <p className='mt-3 text-xs font-semibold text-muted-foreground'>
        {t('board.memberCount', { count: session.allowedEditorIds.length })}
      </p>
      {!!decisions.length && (
        <div className='mt-4 grid gap-3 border-t border-border pt-4'>
          <p className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>{t('board.votingProgress')}</p>
          {orderBoardDecisions(decisions).map((decision) => (
            <SessionDecisionProgress
              key={decision.id}
              decision={decision}
              memberCount={session.allowedEditorIds.length}
            />
          ))}
        </div>
      )}
      {showStateAction && (
        <fetcher.Form method='post' className='mt-3'>
          <input type='hidden' name='intent' value={intent} />
          <input type='hidden' name='sessionId' value={session.id} />
          <button
            disabled={fetcher.state !== 'idle'}
            className={`${boardDialogButton} border border-border text-foreground disabled:opacity-50`}
          >
            {fetcher.state !== 'idle' ? (
              <Loader2 className='size-4 animate-spin' />
            ) : session.status === BoardSessionResDtoOutputStatus.UPCOMING ? (
              <Play className='size-4' />
            ) : (
              <Square className='size-4' />
            )}
            {t(`actions.${intent}`)}
          </button>
        </fetcher.Form>
      )}
      <BoardFeedback data={fetcher.data} />
    </article>
  )
}

function SessionDecisionProgress({
  decision,
  memberCount
}: {
  decision: BoardDecisionResDtoOutput
  memberCount: number
}) {
  const { t } = useTranslation('editor')
  const totalVotes = Math.min(decision.totalVotes, memberCount)
  const abstainCount = Math.max(totalVotes - decision.approveCount - decision.rejectCount, 0)
  const percentage = memberCount > 0 ? Math.min((totalVotes / memberCount) * 100, 100) : 0

  return (
    <div className='rounded-md bg-muted/60 p-3'>
      <div className='flex flex-wrap items-center justify-between gap-2 text-xs'>
        <strong className='text-foreground'>
          {decision.targetSeries?.title
            ? t('board.decisionDisplay.genericTitle', {
                type: t(`board.decisionTypeLabels.${decision.decisionType}`, {
                  defaultValue: t('common.notAvailable')
                }),
                series: decision.targetSeries.title
              })
            : t(`board.decisionTypeLabels.${decision.decisionType}`, {
                defaultValue: t('common.notAvailable')
              })}
        </strong>
        <span className={decision.quorumMet ? 'font-semibold text-primary' : 'text-muted-foreground'}>
          {decision.quorumMet ? t('board.quorumMet') : t('board.quorumPending')}
        </span>
      </div>
      <p className='mt-2 text-xs text-muted-foreground'>
        {t('board.votedMembers', { voted: totalVotes, total: memberCount })}
      </p>
      <div className='mt-2 h-2 overflow-hidden rounded-full bg-background'>
        <div
          className='h-full rounded-full bg-primary transition-[width] duration-300'
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className='mt-2 text-xs text-muted-foreground'>
        {t('board.voteBreakdown', {
          approve: decision.approveCount,
          reject: decision.rejectCount,
          abstain: abstainCount
        })}
      </p>
    </div>
  )
}
