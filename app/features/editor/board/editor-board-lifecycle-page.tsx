import { useEffect, useState } from 'react'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BoardSessionResDtoOutput } from '~/api/model/board'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { boardInput, BoardFeedback, BoardPageLayout, BoardPanel, useBoardFetcher } from './components/board-shared'
import { Dialog } from '~/shared/ui/dialog'

export function EditorBoardLifecyclePage({
  series,
  sessions,
  hasError,
  backPath = '/dashboard/editor/board'
}: {
  series: SeriesListResDtoOutputItemsItem[]
  sessions: BoardSessionResDtoOutput[]
  hasError: boolean
  backPath?: string
}) {
  const { t } = useTranslation('editor')
  const [createOpen, setCreateOpen] = useState(false)
  return (
    <BoardPageLayout
      titleKey='board.sections.lifecycle'
      descriptionKey='board.sectionDescriptions.lifecycle'
      hasError={hasError}
      backPath={backPath}
    >
      <div className='flex justify-end'>
        <button type='button' onClick={() => setCreateOpen(true)} className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
          <Plus className='size-4' />
          {t('actions.createLifecycleDecision')}
        </button>
      </div>
      <BoardPanel title={t('board.lifecycleDecision')}>
        <p className='text-sm text-muted-foreground'>{t('board.sectionDescriptions.lifecycle')}</p>
      </BoardPanel>
      {createOpen && (
        <LifecycleDecisionDialog series={series} sessions={sessions} onClose={() => setCreateOpen(false)} />
      )}
    </BoardPageLayout>
  )
}

function LifecycleDecisionDialog({
  series,
  sessions,
  onClose
}: {
  series: SeriesListResDtoOutputItemsItem[]
  sessions: BoardSessionResDtoOutput[]
  onClose: () => void
}) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()
  const [decisionType, setDecisionType] = useState('CONTINUE')

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <Dialog open onClose={onClose} titleId='create-lifecycle-decision' title={t('board.lifecycleDecision')} size='lg'>
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
            <select
              className={boardInput}
              name='decisionType'
              required
              value={decisionType}
              onChange={(event) => setDecisionType(event.target.value)}
            >
              <option value='CONTINUE'>{t('board.decisionTypes.continue')}</option>
              <option value='CANCELLATION'>{t('board.decisionTypes.cancel')}</option>
              <option value='FORMAT_CHANGE'>{t('board.decisionTypes.format')}</option>
              <option value='COMPLETION'>{t('board.decisionTypes.complete')}</option>
            </select>
          </label>
          {decisionType === 'CANCELLATION' && (
            <label className='grid gap-1.5 text-sm font-semibold lg:col-span-2'>
              {t('board.endingChapterAllowance')}
              <input
                className={boardInput}
                name='endingChapterAllowance'
                type='number'
                min={1}
                required
              />
            </label>
          )}
          {decisionType === 'FORMAT_CHANGE' && (
            <label className='grid gap-1.5 text-sm font-semibold lg:col-span-2'>
              {t('board.newPublicationType')}
              <select className={boardInput} name='publicationType' required defaultValue='WEEKLY'>
                <option value='WEEKLY'>{t('board.publicationTypes.weekly')}</option>
                <option value='MONTHLY'>{t('board.publicationTypes.monthly')}</option>
                <option value='IRREGULAR'>{t('board.publicationTypes.irregular')}</option>
              </select>
            </label>
          )}
          <label className='grid gap-1.5 text-sm font-semibold lg:col-span-2'>
            {t('board.decisionNote')}
            <textarea className={`${boardInput} min-h-28 py-2`} name='decisionNote' />
          </label>
          <div className='flex justify-end gap-2 border-t border-border pt-4 lg:col-span-2'>
            <button type='button' onClick={onClose} className='h-10 rounded-md border border-border px-4 text-sm font-bold'>
              {t('actions.cancel')}
            </button>
            <button
              disabled={fetcher.state !== 'idle' || !series.length || !sessions.length}
              className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
            >
              {fetcher.state !== 'idle' ? <Loader2 className='size-4 animate-spin' /> : <RefreshCw className='size-4' />}
              {t('actions.createLifecycleDecision')}
            </button>
          </div>
        </fetcher.Form>
        <BoardFeedback data={fetcher.data} />
    </Dialog>
  )
}
