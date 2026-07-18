import { Loader2, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BoardSessionResDtoOutput } from '~/api/model/board'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { boardInput, BoardFeedback, BoardPageLayout, BoardPanel, useBoardFetcher } from './components/board-shared'

export function EditorBoardLifecyclePage({
  series,
  sessions,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  sessions: BoardSessionResDtoOutput[]
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()
  return (
    <BoardPageLayout
      titleKey='board.sections.lifecycle'
      descriptionKey='board.sectionDescriptions.lifecycle'
      hasError={hasError}
    >
      <BoardPanel title={t('board.lifecycleDecision')}>
        <fetcher.Form method='post' className='grid gap-4 lg:grid-cols-2'>
          <input type='hidden' name='intent' value='createLifecycleDecision' />
          <label className='grid gap-1.5 text-sm font-semibold'>
            {t('board.selectSession')}
            <select className={boardInput} name='sessionId' required defaultValue=''>
              <option value='' disabled>
                {t('board.selectSession')}
              </option>
              {sessions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className='grid gap-1.5 text-sm font-semibold'>
            {t('board.selectSeries')}
            <select className={boardInput} name='seriesId' required defaultValue=''>
              <option value='' disabled>
                {t('board.selectSeries')}
              </option>
              {series.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {item.status}
                </option>
              ))}
            </select>
          </label>
          <label className='grid gap-1.5 text-sm font-semibold lg:col-span-2'>
            {t('board.decisionType')}
            <select className={boardInput} name='decisionType' required defaultValue='CONTINUE'>
              <option value='CONTINUE'>{t('board.decisionTypes.continue')}</option>
              <option value='CANCEL'>{t('board.decisionTypes.cancel')}</option>
              <option value='HIATUS'>{t('board.decisionTypes.hiatus')}</option>
              <option value='ENDING_ALLOWANCE'>{t('board.decisionTypes.ending')}</option>
              <option value='FORMAT_CHANGE'>{t('board.decisionTypes.format')}</option>
              <option value='COMPLETION'>{t('board.decisionTypes.complete')}</option>
              <option value='REPRINT'>{t('board.decisionTypes.reprint')}</option>
              <option value='TRANSFER'>{t('board.decisionTypes.transfer')}</option>
              <option value='CONTRACT'>{t('board.decisionTypes.contract')}</option>
            </select>
          </label>
          <label className='grid gap-1.5 text-sm font-semibold lg:col-span-2'>
            {t('board.decisionNote')}
            <textarea className={`${boardInput} min-h-28 py-2`} name='decisionNote' />
          </label>
          <button
            disabled={fetcher.state !== 'idle' || !series.length || !sessions.length}
            className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50 lg:col-span-2'
          >
            {fetcher.state !== 'idle' ? <Loader2 className='size-4 animate-spin' /> : <RefreshCw className='size-4' />}
            {t('actions.createLifecycleDecision')}
          </button>
        </fetcher.Form>
        <BoardFeedback data={fetcher.data} />
      </BoardPanel>
    </BoardPageLayout>
  )
}
