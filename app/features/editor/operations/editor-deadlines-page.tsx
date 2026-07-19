import { useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DeadlineRequestListResDtoOutputItemsItem } from '~/api/model/deadline-requests'
import type { ChapterListResDtoOutputItemsItem } from '~/api/model/chapters'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import {
  OperationAction,
  OperationFeedback,
  OperationDialogPanel,
  OperationsLayout,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

export function EditorDeadlinesPage({
  items,
  series,
  chapters,
  focusSeriesId,
  focusChapterId,
  focusRequestId,
  hasError
}: {
  items: DeadlineRequestListResDtoOutputItemsItem[]
  series: SeriesListResDtoOutputItemsItem[]
  chapters: ChapterListResDtoOutputItemsItem[]
  focusSeriesId: string
  focusChapterId: string
  focusRequestId: string
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  const [selectedRequestId, setSelectedRequestId] = useState(focusRequestId)
  const selectedRequest = items.find((item) => item.id === selectedRequestId)
  const editorHasTurn = selectedRequest?.lastProposedBy !== 'EDITOR'
  const negotiable = selectedRequest?.status === 'PROPOSED' || selectedRequest?.status === 'COUNTER_PROPOSED'
  return (
    <OperationsLayout
      titleKey='operations.deadlines'
      descriptionKey='operations.descriptions.deadlines'
      hasError={hasError}
    >
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <form method='get' className='grid gap-3 sm:grid-cols-[1fr_1fr_auto]'>
          <select name='seriesId' defaultValue={focusSeriesId} className={operationInput}>
            <option value=''>{t('operations.selectSeries')}</option>
            {series.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <select name='chapterId' defaultValue={focusChapterId} className={operationInput} disabled={!focusSeriesId}>
            <option value=''>{t('operations.selectChapter')}</option>
            {chapters.map((item) => (
              <option key={item.id} value={item.id}>{t('operations.chapterOption', { number: item.chapterNumber, title: item.title || '' })}</option>
            ))}
          </select>
          <button className='rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
            {t('actions.load')}
          </button>
        </form>
        <div className='mt-4 space-y-2'>
          {items.map((item) => (
            <article key={item.id} className='rounded-lg border border-border p-3 text-sm'>
              <div className='flex justify-between'>
                <strong>{t(`operations.deadlineStatuses.${item.status}`)}</strong>
                <span>{item.requestedBy ?? '—'}</span>
              </div>
              <p className='mt-1 text-muted-foreground'>
                {item.requestedDeadline ? new Date(item.requestedDeadline).toLocaleString() : '—'} ·{' '}
                {item.reason ?? '—'}
              </p>
              <p className='mt-1 break-all text-xs text-muted-foreground'>{item.id}</p>
            </article>
          ))}
        </div>
      </section>
      <OperationDialogPanel icon={CalendarRange} title={t('operations.deadlines')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <select name='chapterId' defaultValue={focusChapterId} className={operationInput} required>
            <option value=''>{t('operations.selectChapter')}</option>
            {chapters.map((item) => (
              <option key={item.id} value={item.id}>{t('operations.chapterOption', { number: item.chapterNumber, title: item.title || '' })}</option>
            ))}
          </select>
          <select
            name='requestId'
            value={selectedRequestId}
            onChange={(event) => setSelectedRequestId(event.target.value)}
            className={operationInput}
          >
            <option value=''>{t('operations.selectDeadlineRequest')}</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {t(`operations.deadlineStatuses.${item.status}`)} ·{' '}
                {item.requestedDeadline ? new Date(item.requestedDeadline).toLocaleString() : '—'}
              </option>
            ))}
            {focusRequestId && !items.some((item) => item.id === focusRequestId) && (
              <option value={focusRequestId}>{focusRequestId}</option>
            )}
          </select>
          <input name='deadline' type='datetime-local' className={operationInput} />
          <input name='reason' className={operationInput} placeholder={t('operations.reason')} />
          <div className='grid grid-cols-2 gap-2'>
            <OperationAction intent='createDeadline' label={t('actions.createRequest')} />
            {negotiable && editorHasTurn && (
              <>
                <OperationAction intent='counterDeadline' label={t('actions.counter')} />
                <OperationAction intent='agreeDeadline' label={t('actions.agree')} />
                <OperationAction intent='rejectDeadline' label={t('actions.reject')} destructive />
              </>
            )}
            {selectedRequest?.status === 'AGREED_BY_PARTIES' && (
              <OperationAction intent='finalizeDeadline' label={t('actions.finalize')} />
            )}
            {selectedRequest?.requestedBy === 'EDITOR' && negotiable && (
              <OperationAction intent='withdrawDeadline' label={t('actions.withdraw')} />
            )}
          </div>
        </fetcher.Form>
        <OperationFeedback data={fetcher.data} />
      </OperationDialogPanel>
    </OperationsLayout>
  )
}
