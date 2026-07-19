import { useEffect, useState } from 'react'
import { CalendarClock, CircleAlert, Loader2, Play, Plus, Radio, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type {
  BoardDecisionResDtoOutput,
  BoardSessionResDtoOutput,
  SuggestBoardMembersResDtoOutputItemsItem
} from '~/api/model/board'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { useAuth } from '~/features/auth/context/auth-context'
import { Dialog } from '~/shared/ui/dialog'
import { orderBoardDecisions, orderBoardSessions } from './board-order'
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
  suggestions,
  preferredMemberCount,
  quorumMin,
  hasError,
  manageAll = false,
  backPath = '/dashboard/editor/board',
  detailBasePath = '/dashboard/editor/board/sessions'
}: {
  series: SeriesListResDtoOutputItemsItem[]
  sessions: BoardSessionResDtoOutput[]
  decisions: BoardDecisionResDtoOutput[]
  suggestions: Record<string, SuggestBoardMembersResDtoOutputItemsItem[]>
  preferredMemberCount: number
  quorumMin: number
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
  const voteProgress = useEditorSessionVoteProgress(sessions, decisions)
  const filteredSessions = orderBoardSessions(
    sessions.filter(
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
          className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'
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
              <select className={boardInput} value={sessionStatus} onChange={(event) => setSessionStatus(event.target.value)}>
                <option value=''>{t('board.filters.allStatuses')}</option>
                <option value='UPCOMING'>{t('board.sessionStatuses.UPCOMING')}</option>
                <option value='ACTIVE'>{t('board.sessionStatuses.ACTIVE')}</option>
                <option value='CONCLUDED'>{t('board.sessionStatuses.CONCLUDED')}</option>
              </select>
          </div>
          {!!sessions.some((session) => session.status === 'ACTIVE') && (
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
              currentUserId={authSession?.user.id ?? ''}
              manageAll={manageAll}
              detailBasePath={detailBasePath}
            />
          ))}
          {!filteredSessions.length && <p className='text-sm text-muted-foreground'>{t('board.emptySessions')}</p>}
        </div>
      </BoardPanel>
      {createDialogOpen && (
        <CreateSessionDialog
          series={series}
          suggestions={suggestions}
          preferredMemberCount={preferredMemberCount}
          quorumMin={quorumMin}
          onClose={() => setCreateDialogOpen(false)}
        />
      )}
    </BoardPageLayout>
  )
}

function CreateSessionDialog({
  series,
  suggestions,
  preferredMemberCount,
  quorumMin,
  onClose
}: {
  series: SeriesListResDtoOutputItemsItem[]
  suggestions: Record<string, SuggestBoardMembersResDtoOutputItemsItem[]>
  preferredMemberCount: number
  quorumMin: number
  onClose: () => void
}) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()
  const [rosterSourceSeriesId, setRosterSourceSeriesId] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const suggestedMembers = suggestions[rosterSourceSeriesId] ?? []
  const rosterIsValid = selectedMemberIds.length === preferredMemberCount
  const timeRangeIsValid = Boolean(startTime) && (!endTime || endTime > startTime)

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  function selectSeries(nextSeriesId: string) {
    setRosterSourceSeriesId(nextSeriesId)
    setSelectedMemberIds((suggestions[nextSeriesId] ?? []).map((member) => member.userId))
  }

  function toggleMember(userId: string) {
    setSelectedMemberIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    )
  }

  return (
    <Dialog
      open
      onClose={onClose}
      titleId='create-board-session-title'
      descriptionId='create-board-session-description'
      title={t('board.sessionTitle')}
      description={t('board.sessionDescription')}
      size='xl'
    >
      <fetcher.Form method='post' className='grid gap-4'>
        <input type='hidden' name='intent' value='createSession' />
        <input type='hidden' name='allowedEditorIds' value={selectedMemberIds.join(',')} />
        {!series.length && (
          <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
            {t('board.noEligibleSeriesForSession')}
          </p>
        )}
        <aside className='rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'>
          <div className='flex items-center gap-2 text-sm font-bold'>
            <CircleAlert className='size-4 shrink-0' />
            {t('board.sessionRulesTitle')}
          </div>
          <ul className='mt-2 list-disc space-y-1 pl-5 text-xs leading-5'>
            <li>{t('board.sessionRuleMemberCount', { count: preferredMemberCount })}</li>
            <li>{t('board.sessionRuleRoster')}</li>
            <li>{t('board.sessionRuleVoting', { count: quorumMin })}</li>
          </ul>
        </aside>
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.sessionName')}
          <input className={boardInput} name='title' minLength={5} required />
        </label>
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.rosterSourceSeries')}
          <select
            className={boardInput}
            name='rosterSourceSeriesId'
            required
            value={rosterSourceSeriesId}
            onChange={(event) => selectSeries(event.target.value)}
          >
            <option value='' disabled>
              {t('board.rosterSourceSeries')}
            </option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <span className='text-xs font-normal text-muted-foreground'>{t('board.rosterSourceSeriesHint')}</span>
        </label>
        <div className='grid min-w-0 gap-3'>
          <label className='grid min-w-0 gap-1.5 text-sm font-semibold'>
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
          <label className='grid min-w-0 gap-1.5 text-sm font-semibold'>
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
        {rosterSourceSeriesId && (
          <fieldset className='grid gap-2 rounded-lg border border-border p-3'>
            <legend className='px-1 text-sm font-bold text-foreground'>{t('board.selectedRoster')}</legend>
            <p className='text-xs text-muted-foreground'>{t('board.selectedRosterHint')}</p>
            {suggestedMembers.map((member) => (
              <label
                key={member.userId}
                className='flex cursor-pointer items-start gap-3 rounded-md border border-border p-3'
              >
                <input
                  type='checkbox'
                  className='mt-1 size-4 accent-primary'
                  checked={selectedMemberIds.includes(member.userId)}
                  onChange={() => toggleMember(member.userId)}
                />
                <span className='min-w-0'>
                  <span className='block text-sm font-bold text-foreground'>{member.displayName || member.userId}</span>
                  <span className='mt-1 block text-xs text-muted-foreground'>
                    {t('board.memberMatch', {
                      score: member.score,
                      genres: member.matchedGenres.join(', ') || t('common.notAvailable')
                    })}
                  </span>
                  {!member.hasProfile && (
                    <span className='mt-1 block text-xs font-semibold text-amber-600'>
                      {t('board.memberWithoutProfile')}
                    </span>
                  )}
                </span>
              </label>
            ))}
            {!suggestedMembers.length && (
              <p className='text-sm text-destructive'>{t('board.notEnoughSuggestedMembers')}</p>
            )}
            <p className={`text-xs font-bold ${rosterIsValid ? 'text-primary' : 'text-destructive'}`}>
              {t('board.selectedMemberCount', { count: selectedMemberIds.length })}
            </p>
          </fieldset>
        )}
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.sessionNote')}
          <textarea className={`${boardInput} min-h-24 py-2`} name='description' maxLength={500} />
        </label>
        <div className='flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end'>
          <button
            type='button'
            onClick={onClose}
            disabled={fetcher.state !== 'idle'}
            className='inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-50'
          >
            {t('actions.cancel')}
          </button>
          <button
            disabled={fetcher.state !== 'idle' || !series.length || !rosterIsValid || !timeRangeIsValid}
            className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
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
  const intent = session.status === 'UPCOMING' ? 'startSession' : 'concludeSession'
  const isCreator = session.creatorId === currentUserId
  const canChange = (isCreator || manageAll) && (session.status === 'UPCOMING' || session.status === 'ACTIVE')
  const hasDecision = decisions.length > 0

  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          {isCreator || manageAll ? (
            <Link
              to={`${detailBasePath}/${session.id}`}
              className='font-bold text-primary hover:underline'
            >
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
      {session.description && <p className='mt-3 text-sm text-muted-foreground'>{session.description}</p>}
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
      {canChange && (
        <fetcher.Form method='post' className='mt-3'>
          <input type='hidden' name='intent' value={intent} />
          <input type='hidden' name='sessionId' value={session.id} />
          <button
            disabled={fetcher.state !== 'idle' || (session.status === 'UPCOMING' && !hasDecision)}
            className='inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-bold text-foreground'
          >
            {fetcher.state !== 'idle' ? (
              <Loader2 className='size-4 animate-spin' />
            ) : session.status === 'UPCOMING' ? (
              <Play className='size-4' />
            ) : (
              <Square className='size-4' />
            )}
            {t(`actions.${intent}`)}
          </button>
        </fetcher.Form>
      )}
      {(isCreator || manageAll) && session.status === 'UPCOMING' && !hasDecision && (
        <p className='mt-2 text-xs font-semibold text-muted-foreground'>{t('board.decisionRequiredBeforeStart')}</p>
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
        <strong className='text-foreground'>{decision.decisionType ?? t('board.sections.decisions')}</strong>
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
