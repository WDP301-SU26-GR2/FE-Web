import { useState } from 'react'
import { BookCopy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ChapterListResDtoOutputItemsItem } from '~/api/model/chapters'
import type { ReprintRequestResDtoOutput } from '~/api/model/reprint-requests'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { Pagination } from '~/shared/components'
import {
  OperationAction,
  OperationDialogPanel,
  OperationFeedback,
  OperationPanel,
  OperationsLayout,
  SeriesSelect,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

const EDITOR_LIST_PAGE_SIZE = 8

export function EditorReprintsPage({
  series,
  chapters,
  reprints,
  contractTypes,
  focusRequestId,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  chapters: ChapterListResDtoOutputItemsItem[]
  reprints: ReprintRequestResDtoOutput[]
  contractTypes: Record<string, string>
  focusRequestId: string
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  const eligibleSeries = series.filter(
    (item) =>
      contractTypes[item.id] &&
      chapters.some((chapter) => chapter.seriesId === item.id && chapter.status === 'PUBLISHED')
  )
  const orderedReprints = [...reprints].sort(
    (left, right) => Number(right.id === focusRequestId) - Number(left.id === focusRequestId)
  )
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(orderedReprints.length / EDITOR_LIST_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const from = orderedReprints.length === 0 ? 0 : (currentPage - 1) * EDITOR_LIST_PAGE_SIZE + 1
  const to = Math.min(currentPage * EDITOR_LIST_PAGE_SIZE, orderedReprints.length)
  const paginatedReprints = orderedReprints.slice(from > 0 ? from - 1 : 0, to)
  return (
    <OperationsLayout
      titleKey='operations.reprints'
      descriptionKey='operations.descriptions.reprints'
      hasError={hasError}
    >
      <OperationPanel
        icon={BookCopy}
        title={t('operations.reprintTrackingSection')}
        headerAction={
          <OperationDialogPanel icon={BookCopy} title={t('operations.createReprintSection')} compact>
            <fetcher.Form method='post' className='grid gap-3'>
              <SeriesSelect series={eligibleSeries} />
              <select name='revisionMode' className={operationInput}>
                <option value='AS_IS'>{t('operations.revisionModes.AS_IS')}</option>
                <option value='WITH_REVISION'>{t('operations.revisionModes.WITH_REVISION')}</option>
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
              <OperationFeedback data={fetcher.data} />
            </fetcher.Form>
          </OperationDialogPanel>
        }
      >
        <div className='grid gap-4'>
          <div className='grid gap-3'>
            {paginatedReprints.map((item) => (
              <article
                key={item.id}
                className={`rounded-lg border p-4 ${item.id === focusRequestId ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <strong>{item.series?.title ?? t('operations.unknownSeries')}</strong>
                  <span className='rounded-full bg-secondary px-2 py-1 text-[10px] font-bold'>
                    {t(`operations.reprintStatuses.${item.status}`)}
                  </span>
                </div>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {t(`operations.revisionModes.${item.revisionMode}`)} · {item.chapterRangeStart}-{item.chapterRangeEnd}
                </p>
                <ul className='mt-3 space-y-2'>
                  {item.chapters.map((chapter) => (
                    <li
                      key={`${item.id}-${chapter.originalChapterId ?? chapter.status}`}
                      className='rounded-md border border-border px-3 py-2 text-sm'
                    >
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <span>
                          {chapter.originalChapterId
                            ? chapterLabel(
                                chapters.find((candidate) => candidate.id === chapter.originalChapterId),
                                t
                              )
                            : t('operations.unknownChapter')}
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          {t(`operations.reprintChapterStatuses.${chapter.status}`)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
            {orderedReprints.length > 0 && (
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                setPage={setPage}
                from={from}
                to={to}
                total={orderedReprints.length}
                tKeyPrefix='pagination'
                t={t}
              />
            )}
            {!reprints.length && <p className='text-xs text-muted-foreground'>{t('operations.noReprints')}</p>}
          </div>
        </div>
      </OperationPanel>
    </OperationsLayout>
  )
}

function chapterLabel(
  chapter: ChapterListResDtoOutputItemsItem | undefined,
  t: ReturnType<typeof useTranslation>['t']
) {
  return chapter
    ? t('operations.chapterOption', { number: chapter.chapterNumber, title: chapter.title || '' })
    : t('operations.unknownChapter')
}
