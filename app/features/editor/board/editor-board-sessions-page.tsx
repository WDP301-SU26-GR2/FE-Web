import { CalendarClock, Loader2, Play, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BoardSessionResDtoOutput } from '~/api/model/board'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import {
  boardInput,
  BoardFeedback,
  BoardPageLayout,
  BoardPanel,
  BoardStatus,
  useBoardAutoRefresh,
  useBoardFetcher
} from './components/board-shared'

export function EditorBoardSessionsPage({
  series,
  sessions,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  sessions: BoardSessionResDtoOutput[]
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  useBoardAutoRefresh()

  return (
    <BoardPageLayout
      titleKey='board.sections.sessions'
      descriptionKey='board.sectionDescriptions.sessions'
      hasError={hasError}
    >
      <div className='grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]'>
        <CreateSessionForm series={series} />
        <BoardPanel title={t('board.sessions')}>
          <div className='grid gap-3'>
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
            {!sessions.length && <p className='text-sm text-muted-foreground'>{t('board.emptySessions')}</p>}
          </div>
        </BoardPanel>
      </div>
    </BoardPageLayout>
  )
}

function CreateSessionForm({ series }: { series: SeriesListResDtoOutputItemsItem[] }) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()

  return (
    <BoardPanel title={t('board.sessionTitle')}>
      <p className='mb-4 text-sm text-muted-foreground'>{t('board.sessionDescription')}</p>
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='intent' value='createSession' />
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.sessionName')}
          <input className={boardInput} name='title' minLength={5} required />
        </label>
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.selectSeries')}
          <select className={boardInput} name='seriesId' required defaultValue=''>
            <option value='' disabled>
              {t('board.selectSeries')}
            </option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <div className='grid gap-3 sm:grid-cols-2'>
          <label className='grid gap-1.5 text-sm font-semibold'>
            {t('board.startTime')}
            <input className={boardInput} name='startTime' type='datetime-local' required />
          </label>
          <label className='grid gap-1.5 text-sm font-semibold'>
            {t('board.endTime')}
            <input className={boardInput} name='endTime' type='datetime-local' />
          </label>
        </div>
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.rosterSize')}
          <input className={boardInput} name='rosterSize' type='number' min={3} step={2} defaultValue={3} required />
        </label>
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.sessionNote')}
          <textarea className={`${boardInput} min-h-24 py-2`} name='description' maxLength={500} />
        </label>
        <button
          disabled={fetcher.state !== 'idle' || !series.length}
          className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
        >
          {fetcher.state !== 'idle' ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <CalendarClock className='size-4' />
          )}
          {t('actions.createSession')}
        </button>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </BoardPanel>
  )
}

function SessionCard({ session }: { session: BoardSessionResDtoOutput }) {
  const { t, i18n } = useTranslation('editor')
  const fetcher = useBoardFetcher()
  const intent = session.status === 'UPCOMING' ? 'startSession' : 'concludeSession'
  const canChange = session.status === 'UPCOMING' || session.status === 'ACTIVE'

  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='font-bold text-foreground'>{session.title}</h3>
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
      {canChange && (
        <fetcher.Form method='post' className='mt-3'>
          <input type='hidden' name='intent' value={intent} />
          <input type='hidden' name='sessionId' value={session.id} />
          <button
            disabled={fetcher.state !== 'idle'}
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
      <BoardFeedback data={fetcher.data} />
    </article>
  )
}
