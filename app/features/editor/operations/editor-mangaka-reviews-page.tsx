import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import {
  OperationAction,
  OperationFeedback,
  OperationPanel,
  OperationsLayout,
  SeriesSelect,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

export function EditorMangakaReviewsPage({
  series,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  return (
    <OperationsLayout
      titleKey='operations.reviews'
      descriptionKey='operations.descriptions.reviews'
      hasError={hasError}
    >
      <OperationPanel icon={Star} title={t('operations.reviews')}>
        <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-2'>
          <SeriesSelect series={series} />
          <input name='mangakaId' required className={operationInput} placeholder='Mangaka ID' />
          <input
            name='rating'
            type='number'
            min={1}
            max={5}
            required
            className={operationInput}
            placeholder={t('operations.rating')}
          />
          <input name='comment' className={operationInput} placeholder={t('operations.comment')} />
          <div className='sm:col-span-2'>
            <OperationAction intent='reviewMangaka' label={t('actions.reviewMangaka')} />
          </div>
        </fetcher.Form>
        <OperationFeedback data={fetcher.data} />
      </OperationPanel>
    </OperationsLayout>
  )
}
