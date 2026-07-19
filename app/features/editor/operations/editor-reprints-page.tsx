import { useState } from 'react'
import { BookCopy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ChapterListResDtoOutputItemsItem } from '~/api/model/chapters'
import type { ReprintRequestResDtoOutput } from '~/api/model/reprint-requests'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import type { MangakaDirectoryListResDtoOutputItemsItem } from '~/api/model/users'
import {
  OperationAction,
  OperationFeedback,
  OperationDialogPanel,
  OperationPanel,
  OperationsLayout,
  SeriesSelect,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

export function EditorReprintsPage({
  series,
  chapters,
  reprints,
  mangakas,
  contractTypes,
  focusRequestId,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  chapters: ChapterListResDtoOutputItemsItem[]
  reprints: ReprintRequestResDtoOutput[]
  mangakas: MangakaDirectoryListResDtoOutputItemsItem[]
  contractTypes: Record<string, string>
  focusRequestId: string
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  const eligibleSeries = series.filter(
    (item) => contractTypes[item.id] && chapters.some((chapter) => chapter.seriesId === item.id && chapter.status === 'PUBLISHED')
  )
  const orderedReprints = [...reprints].sort(
    (left, right) => Number(right.id === focusRequestId) - Number(left.id === focusRequestId)
  )
  return (
    <OperationsLayout
      titleKey='operations.reprints'
      descriptionKey='operations.descriptions.reprints'
      hasError={hasError}
    >
      <OperationDialogPanel icon={BookCopy} title={t('operations.createReprintSection')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <SeriesSelect series={eligibleSeries} />
          <select name='revisionMode' className={operationInput}>
            <option value='AS_IS'>{t('operations.revisionModes.AS_IS')}</option>
            <option value='WITH_REVISION'>{t('operations.revisionModes.WITH_REVISION')}</option>
          </select>
          <input name='reason' required className={operationInput} placeholder={t('operations.reason')} />
          <div className='grid grid-cols-2 gap-3'>
            <input name='chapterStart' type='number' min={0} required className={operationInput} placeholder={t('operations.fromChapter')} />
            <input name='chapterEnd' type='number' min={0} required className={operationInput} placeholder={t('operations.toChapter')} />
          </div>
          <OperationAction intent='createReprint' label={t('actions.createReprint')} />
          <OperationFeedback data={fetcher.data} />
        </fetcher.Form>
      </OperationDialogPanel>

      <OperationDialogPanel icon={BookCopy} title={t('operations.approveReprintSection')}>
        <ReprintChapterForm
          items={reprints}
          chapters={chapters}
          contractTypes={contractTypes}
          intent='approveReprintChapter'
          label={t('actions.approveReprint')}
          allowRevision
        />
      </OperationDialogPanel>

      <OperationDialogPanel icon={BookCopy} title={t('operations.assignReviserSection')}>
        <ReprintChapterForm
          items={reprints}
          chapters={chapters}
          mangakas={mangakas}
          contractTypes={contractTypes}
          intent='assignReviser'
          label={t('actions.assignReviser')}
        />
      </OperationDialogPanel>

      <OperationPanel icon={BookCopy} title={t('operations.reprintTrackingSection')}>
        <div className='grid gap-3'>
          {orderedReprints.map((item) => (
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
              <div className='mt-3 flex flex-wrap gap-2'>
                {item.chapters.map((chapter) => (
                  <span key={chapter.originalChapterId} className='rounded-md border border-border px-2 py-1 text-xs'>
                    {chapter.originalChapterId
                      ? chapterLabel(chapters.find((candidate) => candidate.id === chapter.originalChapterId), t)
                      : t('operations.unknownChapter')}{' '}
                    · {t(`operations.reprintChapterStatuses.${chapter.status}`)}
                  </span>
                ))}
              </div>
            </article>
          ))}
          {!reprints.length && <p className='text-sm text-muted-foreground'>{t('operations.noReprints')}</p>}
        </div>
      </OperationPanel>
    </OperationsLayout>
  )
}

function ReprintChapterForm({
  items,
  chapters,
  mangakas = [],
  contractTypes,
  intent,
  label,
  allowRevision = false
}: {
  items: ReprintRequestResDtoOutput[]
  chapters: ChapterListResDtoOutputItemsItem[]
  mangakas?: MangakaDirectoryListResDtoOutputItemsItem[]
  contractTypes: Record<string, string>
  intent: 'approveReprintChapter' | 'assignReviser'
  label: string
  allowRevision?: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  const [reprintId, setReprintId] = useState('')
  const [reviserType, setReviserType] = useState<'OTHER_MANGAKA' | 'INTERNAL_TEAM'>('OTHER_MANGAKA')
  const eligibleItems = items.filter((item) =>
    intent === 'approveReprintChapter'
      ? ['BOARD_APPROVED', 'APPROVED', 'IN_PRODUCTION'].includes(item.status) &&
        item.chapters.some((chapter) => chapter.status === 'READY')
      : item.revisionMode === 'WITH_REVISION' && contractTypes[item.seriesId] === 'FULL_BUYOUT' &&
        ['BOARD_APPROVED', 'APPROVED', 'IN_PRODUCTION'].includes(item.status) &&
        item.chapters.some((chapter) => ['PENDING', 'IN_REVISION'].includes(chapter.status))
  )
  const selected = eligibleItems.find((item) => item.id === reprintId)
  const chapterIds = (selected?.chapters ?? [])
    .filter((chapter) =>
      intent === 'approveReprintChapter' ? chapter.status === 'READY' : ['PENDING', 'IN_REVISION'].includes(chapter.status)
    )
    .map((chapter) => chapter.originalChapterId)
    .filter((id): id is string => Boolean(id))

  return (
    <fetcher.Form method='post' className='grid gap-3'>
      <select
        name='reprintId'
        required
        className={operationInput}
        value={reprintId}
        onChange={(event) => setReprintId(event.target.value)}
      >
        <option value=''>{t('operations.selectReprint')}</option>
        {eligibleItems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.series?.title ?? t('operations.unknownSeries')} · {t(`operations.reprintStatuses.${item.status}`)}
          </option>
        ))}
      </select>
      <select name='reprintChapterId' required className={operationInput} disabled={!reprintId}>
        <option value=''>{t('operations.selectReprintChapter')}</option>
        {chapterIds.map((id) => {
          const chapter = chapters.find((item) => item.id === id)
          return (
            <option key={id} value={id}>
              {chapter
                ? t('operations.chapterOption', { number: chapter.chapterNumber, title: chapter.title || '' })
                : t('operations.unknownChapter')}
            </option>
          )
        })}
      </select>
      {intent === 'assignReviser' && (
        <>
          <select
            name='reviserType'
            className={operationInput}
            value={reviserType}
            onChange={(event) => setReviserType(event.target.value as typeof reviserType)}
          >
            <option value='OTHER_MANGAKA'>{t('operations.reviserTypes.OTHER_MANGAKA')}</option>
            <option value='INTERNAL_TEAM'>{t('operations.reviserTypes.INTERNAL_TEAM')}</option>
          </select>
          {reviserType === 'OTHER_MANGAKA' ? (
            <select name='reviserId' required className={operationInput}>
              <option value=''>{t('operations.selectReviser')}</option>
              {mangakas.map((mangaka) => (
                <option key={mangaka.userId} value={mangaka.userId}>
                  {mangaka.penName || mangaka.displayName || t('operations.unknownMangaka')}
                </option>
              ))}
            </select>
          ) : (
            <input name='reviserId' required className={operationInput} placeholder={t('operations.internalReviserId')} />
          )}
        </>
      )}
      <div className='flex flex-wrap gap-2'>
        <OperationAction intent={intent} label={label} />
        {allowRevision && (
          <OperationAction intent='requestReprintRevision' label={t('actions.requestReprintRevision')} destructive />
        )}
      </div>
      <OperationFeedback data={fetcher.data} />
    </fetcher.Form>
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
