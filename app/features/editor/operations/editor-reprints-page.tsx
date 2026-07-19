import { BookCopy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReprintRequestResDtoOutput } from '~/api/model/reprint-requests'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import {
  OperationAction,
  OperationFeedback,
  OperationDialogPanel,
  OperationsLayout,
  SeriesSelect,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

export function EditorReprintsPage({
  series,
  reprints,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  reprints: ReprintRequestResDtoOutput[]
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  return (
    <OperationsLayout
      titleKey='operations.reprints'
      descriptionKey='operations.descriptions.reprints'
      hasError={hasError}
    >
      <OperationDialogPanel icon={BookCopy} title={t('operations.createReprintSection')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <SeriesSelect series={series} />
          <select name='revisionMode' className={operationInput}>
            <option>AS_IS</option>
            <option>WITH_REVISION</option>
          </select>
          <input name='reason' required className={operationInput} placeholder={t('operations.reason')} />
          <div className='grid grid-cols-2 gap-3'>
            <input
              name='chapterStart'
              type='number'
              min={1}
              required
              className={operationInput}
              placeholder={t('operations.fromChapter')}
            />
            <input
              name='chapterEnd'
              type='number'
              min={1}
              required
              className={operationInput}
              placeholder={t('operations.toChapter')}
            />
          </div>
          <OperationAction intent='createReprint' label={t('actions.createReprint')} />
        </fetcher.Form>
      </OperationDialogPanel>
      <OperationDialogPanel icon={BookCopy} title={t('operations.approveReprintSection')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <ReprintSelect items={reprints} />
          <input name='reprintChapterId' required className={operationInput} placeholder='Reprint chapter ID' />
          <input name='originalChapterId' required className={operationInput} placeholder='Original chapter ID' />
          <OperationAction intent='approveReprintChapter' label={t('actions.approveReprint')} />
        </fetcher.Form>
      </OperationDialogPanel>
      <OperationDialogPanel icon={BookCopy} title={t('operations.assignReviserSection')}>
        <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-2'>
          <ReprintSelect items={reprints} />
          <input name='reprintChapterId' required className={operationInput} placeholder='Reprint chapter ID' />
          <input name='reviserId' required className={operationInput} placeholder='Reviser ID' />
          <select name='reviserType' className={operationInput}>
            <option>INTERNAL_TEAM</option>
            <option>OTHER_MANGAKA</option>
          </select>
          <div className='sm:col-span-2'>
            <OperationAction intent='assignReviser' label={t('actions.assignReviser')} />
          </div>
        </fetcher.Form>
        <OperationFeedback data={fetcher.data} />
      </OperationDialogPanel>
    </OperationsLayout>
  )
}

function ReprintSelect({ items }: { items: ReprintRequestResDtoOutput[] }) {
  return (
    <select name='reprintId' required className={operationInput}>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.series?.title ?? item.seriesId} · {item.status}
        </option>
      ))}
    </select>
  )
}
