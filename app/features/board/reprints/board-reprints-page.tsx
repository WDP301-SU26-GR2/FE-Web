import { Form, useFetcher } from 'react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AssignReviserBodyDtoReviserType,
  ReprintRequestResDtoOutputStatus,
  type ReprintRequestResDtoOutput
} from '~/api/model/reprint-requests'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import type { MangakaDirectoryListResDtoOutputItemsItem } from '~/api/model/users'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import {
  BoardActionDialog,
  boardDialogButton,
  boardInput,
  BoardFeedback,
  BoardHeader,
  BoardPanel,
  EmptyState,
  StatusBadge
} from '../components/board-ui'
import type { BoardActionResult } from '../types'

export function BoardReprintsPage({
  requests,
  series,
  contractTypes,
  mangakas,
  hasError,
  seriesId,
  status: selectedStatus
}: {
  requests: ReprintRequestResDtoOutput[]
  series: SeriesListResDtoOutputItemsItem[]
  contractTypes: Record<string, string>
  mangakas: MangakaDirectoryListResDtoOutputItemsItem[]
  hasError: boolean
  seriesId: string
  status: string
}) {
  const { t } = useTranslation('board')
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader
        title={t('reprints.title')}
        description={t('reprints.description')}
        backHref='/dashboard/board/operations'
      />
      <BoardPanel title={t('reprints.lookup')}>
        <Form method='get' replace preventScrollReset className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'>
          <select className={boardInput} name='seriesId' defaultValue={seriesId} required>
            <option value=''>{t('reprints.selectSeries')}</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <select className={boardInput} name='status' defaultValue={selectedStatus} required>
            {Object.values(ReprintRequestResDtoOutputStatus).map((value) => (
              <option key={value} value={value}>
                {t(`filters.reprintStatuses.${value}`, { defaultValue: t('common.notAvailable') })}
              </option>
            ))}
          </select>
          <button className={`${boardDialogButton} bg-primary text-primary-foreground`}>
            {t('common.load')}
          </button>
        </Form>
      </BoardPanel>
      {hasError && <p className='text-xs text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-4'>
        {requests.map((item) => (
          <ReprintCard key={item.id} item={item} contractType={contractTypes[item.seriesId]} mangakas={mangakas} />
        ))}
      </div>
      {!requests.length && <EmptyState text={t('reprints.empty')} />}
    </div>
  )
}

function ReprintCard({
  item,
  contractType,
  mangakas
}: {
  item: ReprintRequestResDtoOutput
  contractType?: string
  mangakas: MangakaDirectoryListResDtoOutputItemsItem[]
}) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  const isFullBuyoutReview = contractType === 'FULL_BUYOUT' && (item.status === 'PENDING' || item.status === 'PROPOSED')
  const isRevenueShareReview =
    contractType === 'REVENUE_SHARE' && (item.status === 'MANGAKA_APPROVED' || item.status === 'MANGAKA_REVIEW')
  const canReview = isFullBuyoutReview || isRevenueShareReview
  const canReject = canReview
  const isSubmitting = fetcher.state !== 'idle'
  const revisableChapters = item.chapters.filter(
    (chapter) => chapter.originalChapterId && ['PENDING', 'IN_REVISION'].includes(chapter.status)
  )
  const canAssignReviser =
    contractType === 'FULL_BUYOUT' &&
    item.revisionMode === 'WITH_REVISION' &&
    ['BOARD_APPROVED', 'APPROVED'].includes(item.status) &&
    revisableChapters.length > 0
  return (
    <article className='rounded-xl border border-border bg-card p-5'>
      <div className='flex justify-between gap-3'>
        <div>
          <strong>{item.series?.title ?? t('reprints.unknownSeries')}</strong>
          {item.requester ? <p className='mt-1 text-xs text-muted-foreground'>{item.requester.displayName}</p> : null}
          <p className='mt-1 text-xs text-muted-foreground'>
            {t(`reprints.revisionModes.${item.revisionMode}`, { defaultValue: t('common.notAvailable') })} ·{' '}
            {item.chapterRangeStart}-{item.chapterRangeEnd}
          </p>
        </div>
        <StatusBadge value={item.status} />
      </div>
      <p className='mt-3 text-xs text-muted-foreground'>{item.reason}</p>
      {canReview && (
        <div className='mt-4'>
          <BoardActionDialog title={t('reprints.review')}>
            <fetcher.Form method='post' className='mt-4 grid gap-2 sm:grid-cols-2'>
              <input type='hidden' name='requestId' value={item.id} />
              <input
                className={`${boardInput} sm:col-span-2`}
                name='reason'
                placeholder={t('reprints.reviewReason')}
              />
              <button
                name='intent'
                value='approve'
                disabled={isSubmitting}
                className={`${boardDialogButton} bg-success text-success-foreground hover:opacity-90 disabled:opacity-50 sm:w-full`}
              >
                {isSubmitting ? (
                  <Loader2 className='mr-1.5 inline size-4 animate-spin' aria-hidden='true' />
                ) : (
                  <CheckCircle2 className='mr-1.5 inline size-4' aria-hidden='true' />
                )}
                {t('reprints.approve')}
              </button>
              {canReject && (
                <button
                  name='intent'
                  value='reject'
                  disabled={isSubmitting}
                  className={`${boardDialogButton} border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 sm:w-full`}
                >
                  {isSubmitting ? (
                    <Loader2 className='mr-1.5 inline size-4 animate-spin' aria-hidden='true' />
                  ) : (
                    <XCircle className='mr-1.5 inline size-4' aria-hidden='true' />
                  )}
                  {t('reprints.reject')}
                </button>
              )}
            </fetcher.Form>
            <BoardFeedback data={fetcher.data} />
          </BoardActionDialog>
        </div>
      )}
      {['PENDING', 'MANGAKA_REVIEW'].includes(item.status) && contractType === 'REVENUE_SHARE' && (
        <p className='mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground'>{t('reprints.waitingMangaka')}</p>
      )}
      {canAssignReviser && (
        <div className='mt-4'>
          <AssignReviserDialog item={item} chapters={revisableChapters} mangakas={mangakas} />
        </div>
      )}
    </article>
  )
}

function AssignReviserDialog({
  item,
  chapters,
  mangakas
}: {
  item: ReprintRequestResDtoOutput
  chapters: ReprintRequestResDtoOutput['chapters']
  mangakas: MangakaDirectoryListResDtoOutputItemsItem[]
}) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  const [reviserType, setReviserType] = useState<keyof typeof AssignReviserBodyDtoReviserType>(
    AssignReviserBodyDtoReviserType.OTHER_MANGAKA
  )
  return (
    <BoardActionDialog title={t('reprints.assignReviser')}>
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='intent' value='assignReviser' />
        <input type='hidden' name='requestId' value={item.id} />
        <select className={boardInput} name='chapterId' required>
          <option value=''>{t('reprints.selectChapter')}</option>
          {chapters.map((chapter, index) => (
            <option key={chapter.originalChapterId} value={chapter.originalChapterId ?? ''}>
              {t('reprints.chapter', { number: (item.chapterRangeStart ?? 1) + index })} ·{' '}
              {t(`reprints.chapterStatuses.${chapter.status}`)}
            </option>
          ))}
        </select>
        <select
          className={boardInput}
          name='reviserType'
          value={reviserType}
          onChange={(event) => setReviserType(event.target.value as keyof typeof AssignReviserBodyDtoReviserType)}
        >
          {Object.values(AssignReviserBodyDtoReviserType).map((value) => (
            <option key={value} value={value}>
              {t(`reprints.reviserTypes.${value}`)}
            </option>
          ))}
        </select>
        {reviserType === AssignReviserBodyDtoReviserType.OTHER_MANGAKA ? (
          <select className={boardInput} name='reviserId' required>
            <option value=''>{t('reprints.selectReviser')}</option>
            {mangakas.map((mangaka) => (
              <option key={mangaka.userId} value={mangaka.userId}>
                {mangaka.penName || mangaka.displayName || t('reprints.unknownMangaka')}
              </option>
            ))}
          </select>
        ) : (
          <input className={boardInput} name='reviserId' placeholder={t('reprints.internalReviserId')} required />
        )}
        <button
          disabled={
            (reviserType === AssignReviserBodyDtoReviserType.OTHER_MANGAKA && !mangakas.length) ||
            fetcher.state !== 'idle'
          }
          className={`${boardDialogButton} bg-primary text-primary-foreground disabled:opacity-50`}
        >
          {fetcher.state !== 'idle' && <Loader2 className='mr-1.5 inline size-4 animate-spin' aria-hidden='true' />}
          {t('reprints.assignReviser')}
        </button>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </BoardActionDialog>
  )
}
