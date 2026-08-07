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

const reviewDialogFieldClass = 'grid min-w-0 grid-rows-[2.5rem_auto] gap-1.5 text-xs font-bold text-foreground'
const reviewDialogFieldLabelClass = 'flex min-h-10 items-end leading-5'

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
  const mangakaSeries = series.filter((item) => item.mangakaId === mangakaId)
  return (
    <OperationsLayout
      titleKey='operations.reviews'
      descriptionKey='operations.descriptions.reviews'
      hasError={hasError}
    >
      <OperationDialogPanel icon={Star} title={t('operations.reviews')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <label className={reviewDialogFieldClass}>
            <span className={reviewDialogFieldLabelClass}>{t('operations.selectMangaka')}</span>
            <select
              required
              name='mangakaId'
              className={operationInput}
              value={mangakaId}
              onChange={(event) => {
                setMangakaId(event.target.value)
                setSeriesId('')
              }}
            >
              <option value=''>{t('operations.selectMangaka')}</option>
              {mangakas.map((item) => (
                <option key={item.userId} value={item.userId}>
                  {item.penName || item.displayName || t('operations.unknownMangaka')}
                </option>
              ))}
            </select>
          </label>
          <label className={reviewDialogFieldClass}>
            <span className={reviewDialogFieldLabelClass}>{t('operations.reviewSeriesOwner')}</span>
            <SeriesSelect
              series={mangakaSeries}
              value={seriesId}
              onChange={setSeriesId}
              required={false}
              disabled={!mangakaId}
            />
            {!mangakaId && (
              <span className='font-normal text-muted-foreground'>{t('operations.selectSeriesFirst')}</span>
            )}
          </label>
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
          <div>
            <OperationAction intent='reviewMangaka' label={t('actions.reviewMangaka')} />
          </div>
        </fetcher.Form>
        <OperationFeedback data={fetcher.data} />
      </OperationDialogPanel>
    </OperationsLayout>
  )
}
