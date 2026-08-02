import { useState } from 'react'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import type { MangakaDirectoryListResDtoOutputItemsItem } from '~/api/model/users'
import {
  OperationAction,
  OperationFeedback,
  OperationDialogPanel,
  OperationsLayout,
  SeriesSelect,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

export function EditorMangakaReviewsPage({
  series,
  mangakas,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  mangakas: MangakaDirectoryListResDtoOutputItemsItem[]
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  const [seriesId, setSeriesId] = useState('')
  const [mangakaId, setMangakaId] = useState('')
  const selectedSeries = series.find((item) => item.id === seriesId)
  const selectedMangakaId = selectedSeries?.mangakaId ?? mangakaId
  return (
    <OperationsLayout
      titleKey='operations.reviews'
      descriptionKey='operations.descriptions.reviews'
      hasError={hasError}
    >
      <OperationDialogPanel icon={Star} title={t('operations.reviews')}>
        <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-2'>
          <SeriesSelect series={series} value={seriesId} onChange={setSeriesId} required={false} />
          <input type='hidden' name='mangakaId' value={selectedMangakaId} />
          <select
            required
            className={operationInput}
            value={selectedMangakaId}
            onChange={(event) => setMangakaId(event.target.value)}
            disabled={Boolean(selectedSeries)}
          >
            <option value=''>{t('operations.selectMangaka')}</option>
            {mangakas.map((item) => (
              <option key={item.userId} value={item.userId}>
                {item.penName || item.displayName || t('operations.unknownMangaka')}
              </option>
            ))}
          </select>
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
      </OperationDialogPanel>
    </OperationsLayout>
  )
}
