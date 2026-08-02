import { useEffect, useState } from 'react'
import { CalendarClock, CircleAlert, Loader2, Play, Plus, Radio, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import {
  BoardSessionResDtoOutputStatus,
  type BoardDecisionResDtoOutput,
  type BoardSessionResDtoOutput
} from '~/api/model/board'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { useAuth } from '~/features/auth/context/auth-context'
import { Dialog } from '~/shared/ui/dialog'
import { orderBoardDecisions, orderBoardSessions } from './board-order'
import {
  BOARD_SESSION_INTENTS,
  BOARD_ROSTER_MODES,
  BOARD_SESSION_FIELD_LIMITS,
  isValidBoardSessionTimeRange,
  isValidManualBoardRoster,
  parseManualBoardMemberIds
} from './board-session-flow'
import {
  boardInput,
  BoardFeedback,
  BoardPageLayout,
  BoardPanel,
  BoardStatus,
  useBoardAutoRefresh,
  useBoardFetcher
} from './components/board-shared'
import { useEditorSessionVoteProgress } from './hooks/use-editor-session-vote-progress'

export function EditorBoardSessionsPage({
  series,
  sessions,
  decisions,
  suggestedMemberCount,
  maximumMemberCount,
  hasError,
  manageAll = false,
  backPath = '/dashboard/editor/board',
  detailBasePath = '/dashboard/editor/board/sessions'
}: {
  series: SeriesListResDtoOutputItemsItem[]
  sessions: BoardSessionResDtoOutput[]
  decisions: BoardDecisionResDtoOutput[]
  suggestedMemberCount: number
  maximumMemberCount: number
  hasError: boolean
  manageAll?: boolean
  backPath?: string
  detailBasePath?: string
}) {
  const { t } = useTranslation('editor')
  const { session: authSession } = useAuth()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
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
      <div className='flex justify-end'>
        <button
          type='button'
          onClick={() => setCreateDialogOpen(true)}
          className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'
        >
          <Plus className='size-4' />
          {t('actions.createSession')}
        </button>
      </div>
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
          series={series}
          suggestedMemberCount={suggestedMemberCount}
          maximumMemberCount={maximumMemberCount}
          onClose={() => setCreateDialogOpen(false)}
        />
      )}
    </BoardPageLayout>
  )
}

function CreateSessionDialog({
  series,
  suggestedMemberCount,
  maximumMemberCount,
  onClose
}: {
  series: SeriesListResDtoOutputItemsItem[]
  suggestedMemberCount: number
  maximumMemberCount: number
  onClose: () => void
}) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()
  const suggestionFetcher = useBoardFetcher()
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [rosterMode, setRosterMode] = useState<(typeof BOARD_ROSTER_MODES)[keyof typeof BOARD_ROSTER_MODES]>(
    series.length ? BOARD_ROSTER_MODES.automatic : BOARD_ROSTER_MODES.manual
  )
  const [rosterSourceSeriesId, setRosterSourceSeriesId] = useState(series[0]?.id ?? '')
  const [manualRosterIds, setManualRosterIds] = useState('')
  const [suggestedForSeriesId, setSuggestedForSeriesId] = useState('')
  const timeRangeIsValid = isValidBoardSessionTimeRange(startTime, endTime || undefined)
  const parsedManualRosterIds = parseManualBoardMemberIds(manualRosterIds)
  const manualRosterIsValid = isValidManualBoardRoster(parsedManualRosterIds, maximumMemberCount)
  const rosterIsValid =
    rosterMode === BOARD_ROSTER_MODES.automatic ? Boolean(rosterSourceSeriesId) : manualRosterIsValid
  const suggestedMembers =
    suggestedForSeriesId === rosterSourceSeriesId ? suggestionFetcher.data?.suggestedMembers : undefined

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

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
    >
      <fetcher.Form method='post' className='grid gap-4'>
        <input type='hidden' name='intent' value={BOARD_SESSION_INTENTS.create} />
        <input type='hidden' name='rosterSize' value={suggestedMemberCount} />
        <aside className='rounded-lg border border-border bg-muted p-3 text-foreground'>
          <div className='flex items-center gap-2 text-xs font-bold'>
            <CircleAlert className='size-4 shrink-0' />
            {t('board.sessionRulesTitle')}
          </div>
          <p className='mt-2 text-xs leading-5'>
            {t('board.sessionSystemRosterNotice', { count: suggestedMemberCount })}
          </p>
        </aside>
        <fieldset className='grid gap-2'>
          <legend className='text-xs font-semibold'>{t('board.rosterMode')}</legend>
          <div className='grid gap-2 sm:grid-cols-2'>
            <label className='flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 text-xs'>
              <input
                className='mt-0.5'
                type='radio'
                name='rosterMode'
                value={BOARD_ROSTER_MODES.automatic}
                checked={rosterMode === BOARD_ROSTER_MODES.automatic}
                disabled={!series.length}
                onChange={() => setRosterMode(BOARD_ROSTER_MODES.automatic)}
              />
              <span>
                <strong className='block text-foreground'>{t('board.automaticRoster')}</strong>
                <span className='mt-1 block text-muted-foreground'>{t('board.automaticRosterHint')}</span>
              </span>
            </label>
            <label className='flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 text-xs'>
              <input
                className='mt-0.5'
                type='radio'
                name='rosterMode'
                value={BOARD_ROSTER_MODES.manual}
                checked={rosterMode === BOARD_ROSTER_MODES.manual}
                onChange={() => setRosterMode(BOARD_ROSTER_MODES.manual)}
              />
              <span>
                <strong className='block text-foreground'>{t('board.manualRosterMode')}</strong>
                <span className='mt-1 block text-muted-foreground'>{t('board.manualRosterHint')}</span>
              </span>
            </label>
          </div>
        </fieldset>
        {rosterMode === BOARD_ROSTER_MODES.automatic ? (
          <label className='grid gap-1.5 text-xs font-semibold'>
            {t('board.rosterSourceSeries')}
            <select
              className={boardInput}
              name='rosterSourceSeriesId'
              required
              value={rosterSourceSeriesId}
              onChange={(event) => setRosterSourceSeriesId(event.target.value)}
            >
              <option value=''>{t('board.selectRosterSourceSeries')}</option>
              {series.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ·{' '}
                  {t(`filters.seriesStatuses.${item.status}`, { defaultValue: t('common.notAvailable') })}
                </option>
              ))}
            </select>
            <span className='font-normal text-muted-foreground'>{t('board.rosterSourceSeriesHint')}</span>
            <button
              type='button'
              disabled={!rosterSourceSeriesId || suggestionFetcher.state !== 'idle'}
              onClick={() => {
                setSuggestedForSeriesId(rosterSourceSeriesId)
                void suggestionFetcher.submit(
                  {
                    intent: BOARD_SESSION_INTENTS.suggestMembers,
                    seriesId: rosterSourceSeriesId,
                    rosterSize: String(suggestedMemberCount)
                  },
                  { method: 'post' }
                )
              }}
              className='mt-1 inline-flex h-9 w-fit items-center gap-2 rounded-md border border-border px-3 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50'
            >
              {suggestionFetcher.state !== 'idle' && <Loader2 className='size-4 animate-spin' />}
              {t('actions.previewSuggestedMembers')}
            </button>
            {suggestedMembers && (
              <div className='mt-2 grid gap-2 rounded-lg border border-border bg-background p-3'>
                <strong className='text-xs text-foreground'>
                  {t('board.suggestedMembersTitle', {
                    count: suggestionFetcher.data?.suggestedSize ?? suggestedMembers.length
                  })}
                </strong>
                {suggestedMembers.map((member) => (
                  <div key={member.userId} className='rounded-md bg-muted p-2 font-normal'>
                    <span className='block font-semibold text-foreground'>
                      {member.displayName || t('board.unnamedBoardMember')}
                    </span>
                    <span className='mt-1 block text-muted-foreground'>
                      {t('board.suggestedMemberMatch', {
                        genres: member.matchedGenres.join(', ') || t('board.noMatchedGenres'),
                        score: member.score
                      })}
                    </span>
                  </div>
                ))}
                {!suggestedMembers.length && (
                  <span className='font-normal text-muted-foreground'>{t('board.emptySuggestedMembers')}</span>
                )}
              </div>
            )}
            <BoardFeedback data={suggestionFetcher.data} />
          </label>
        ) : (
          <label className='grid gap-1.5 text-xs font-semibold'>
            {t('board.manualRosterIds')}
            <textarea
              className={`${boardInput} min-h-24 py-2`}
              name='manualRosterIds'
              required
              value={manualRosterIds}
              onChange={(event) => setManualRosterIds(event.target.value)}
              placeholder={t('board.manualRosterPlaceholder')}
            />
            <span
              className={`font-normal ${manualRosterIds && !manualRosterIsValid ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {t('board.manualRosterValidation', { maximum: maximumMemberCount })}
            </span>
          </label>
        )}
        {!series.length && (
          <p className='rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground'>
            {t('board.noSeriesForAutomaticRoster')}
          </p>
        )}
        <label className='grid gap-1.5 text-xs font-semibold'>
          {t('board.sessionName')}
          <input
            className={boardInput}
            name='title'
            minLength={BOARD_SESSION_FIELD_LIMITS.titleMinLength}
            maxLength={BOARD_SESSION_FIELD_LIMITS.titleMaxLength}
            required
          />
        </label>
        <div className='grid min-w-0 gap-3'>
          <label className='grid min-w-0 gap-1.5 text-xs font-semibold'>
            {t('board.startTime')}
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
          <label className='grid min-w-0 gap-1.5 text-xs font-semibold'>
            {t('board.endTime')}
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
        <label className='grid gap-1.5 text-xs font-semibold'>
          {t('board.sessionNote')}
          <textarea
            className={`${boardInput} min-h-24 py-2`}
            name='description'
            maxLength={BOARD_SESSION_FIELD_LIMITS.descriptionMaxLength}
          />
        </label>
        <div className='flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end'>
          <button
            type='button'
            onClick={onClose}
            disabled={fetcher.state !== 'idle'}
            className='inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50'
          >
            {t('actions.cancel')}
          </button>
          <button
            disabled={fetcher.state !== 'idle' || !rosterIsValid || !timeRangeIsValid}
            className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'
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
            className='inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-bold text-foreground'
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
