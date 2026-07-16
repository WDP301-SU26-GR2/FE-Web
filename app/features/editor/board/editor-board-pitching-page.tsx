import { Loader2, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import type { SuggestBoardMembersResDtoOutputItemsItem } from '~/api/model/board'
import { BoardFeedback, BoardPageLayout, BoardPanel, useBoardFetcher } from './components/board-shared'

export function EditorBoardPitchingPage({
  series,
  suggestions,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  suggestions: Record<string, SuggestBoardMembersResDtoOutputItemsItem[]>
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  return (
    <BoardPageLayout
      titleKey='board.sections.pitching'
      descriptionKey='board.sectionDescriptions.pitching'
      hasError={hasError}
    >
      <BoardPanel title={t('board.readyTitle')}>
        <div className='grid gap-3'>
          {series.map((item) => (
            <PitchCard key={item.id} series={item} suggestions={suggestions[item.id] ?? []} />
          ))}
          {!series.length && <p className='text-sm text-muted-foreground'>{t('board.emptyReady')}</p>}
        </div>
      </BoardPanel>
    </BoardPageLayout>
  )
}

function PitchCard({
  series,
  suggestions
}: {
  series: SeriesListResDtoOutputItemsItem
  suggestions: SuggestBoardMembersResDtoOutputItemsItem[]
}) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()
  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h3 className='font-bold text-foreground'>{series.title}</h3>
          <p className='mt-1 text-xs text-muted-foreground'>
            {series.demographic ?? '—'} · {series.publicationType ?? '—'}
          </p>
        </div>
        <fetcher.Form method='post'>
          <input type='hidden' name='intent' value='pitch' />
          <input type='hidden' name='seriesId' value={series.id} />
          <button
            disabled={fetcher.state !== 'idle'}
            className='inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
          >
            {fetcher.state !== 'idle' ? <Loader2 className='size-4 animate-spin' /> : <Send className='size-4' />}
            {t('actions.pitch')}
          </button>
        </fetcher.Form>
      </div>
      {!!suggestions.length && (
        <div className='mt-3 flex flex-wrap gap-2'>
          {suggestions.map((member) => (
            <span
              key={member.userId}
              className='rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground'
            >
              {member.displayName ?? member.userId.slice(-6)}
            </span>
          ))}
        </div>
      )}
      <BoardFeedback data={fetcher.data} />
    </article>
  )
}
