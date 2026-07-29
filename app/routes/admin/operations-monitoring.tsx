import { ArrowLeft, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Form, Link } from 'react-router'
import { useState, type ReactNode } from 'react'

import type { DeadlineRequestResDtoOutput } from '~/api/model/deadline-requests'
import type { ChapterListResDtoOutputItemsItem } from '~/api/model/chapters'
import type { ReprintRequestResDtoOutput } from '~/api/model/reprint-requests'
import type { RevisionRequestListResDtoOutputItemsItem } from '~/api/model/revision'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { deadlineControllerGetOne, deadlineControllerList } from '~/api/operations/deadline-requests/deadline-requests'
import { chapterControllerListBySeries } from '~/api/operations/chapters/chapters'
import {
  reprintRequestControllerFindAll,
  reprintRequestControllerFindById
} from '~/api/operations/reprint-requests/reprint-requests'
import { revisionControllerList } from '~/api/operations/revision/revision'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'

interface MonitoringData {
  series: SeriesListResDtoOutputItemsItem[]
  chapters: ChapterListResDtoOutputItemsItem[]
  revisions: RevisionRequestListResDtoOutputItemsItem[]
  reprints: ReprintRequestResDtoOutput[]
  selectedReprint: ReprintRequestResDtoOutput | null
  deadlines: DeadlineRequestResDtoOutput[]
  chapterId: string
  seriesId: string
  hasError: boolean
}

export async function clientLoader({ request }: { request: Request }): Promise<MonitoringData> {
  const searchParams = new URL(request.url).searchParams
  const chapterId = searchParams.get('chapterId')?.trim() ?? ''
  const seriesId = searchParams.get('seriesId')?.trim() ?? ''
  const reprintId = searchParams.get('reprintId')?.trim() ?? ''
  const [seriesResult, chapterResult, revisionResult, reprintResult, deadlineResult, reprintDetailResult] =
    await Promise.allSettled([
      loadAllOffsetItems((pagination) => seriesControllerListSeries(pagination).then((response) => response.data)).then(
        (items) => ({ status: 200 as const, data: { items } })
      ),
      seriesId ? chapterControllerListBySeries({ seriesId }) : null,
      revisionControllerList({ limit: 20, offset: 0 }),
      reprintRequestControllerFindAll({
        status: undefined as unknown as string,
        seriesId: undefined as unknown as string
      }),
      chapterId ? deadlineControllerList({ chapterId }) : null,
      reprintId ? reprintRequestControllerFindById({ id: reprintId }) : null
    ])
  const seriesOk = seriesResult.status === 'fulfilled' && seriesResult.value.status === 200
  const revisionOk = revisionResult.status === 'fulfilled' && revisionResult.value.status === 200
  const reprintOk = reprintResult.status === 'fulfilled' && reprintResult.value.status === 200
  const deadlineOk =
    !chapterId ||
    (deadlineResult.status === 'fulfilled' && deadlineResult.value !== null && deadlineResult.value.status === 200)

  const detailedReprints = reprintOk
    ? await Promise.all(
        reprintResult.value.data.map((item) =>
          reprintRequestControllerFindById({ id: item.id })
            .then((detail) => detail.data)
            .catch(() => null)
        )
      )
    : []
  const detailedDeadlines =
    chapterId && deadlineResult.status === 'fulfilled' && deadlineResult.value?.status === 200
      ? await Promise.all(
          deadlineResult.value.data.items.map((item) =>
            deadlineControllerGetOne({ id: item.id })
              .then((detail) => detail.data)
              .catch(() => null)
          )
        )
      : []

  return {
    series: seriesOk ? seriesResult.value.data.items : [],
    chapters:
      chapterResult.status === 'fulfilled' && chapterResult.value?.status === 200 ? chapterResult.value.data.items : [],
    revisions:
      revisionResult.status === 'fulfilled' && revisionResult.value.status === 200
        ? revisionResult.value.data.items
        : [],
    reprints: detailedReprints.filter((item) => item !== null),
    selectedReprint:
      reprintId && reprintDetailResult.status === 'fulfilled' && reprintDetailResult.value?.status === 200
        ? reprintDetailResult.value.data
        : null,
    deadlines: detailedDeadlines.filter((item) => item !== null),
    chapterId,
    seriesId,
    hasError: !seriesOk || !revisionOk || !reprintOk || !deadlineOk
  }
}

export default function AdminOperationsMonitoringRoute({ loaderData }: { loaderData: MonitoringData }) {
  const { t } = useTranslation('admin')
  const { series, chapters, revisions, reprints, selectedReprint, deadlines, chapterId, seriesId, hasError } =
    loaderData
  const [seriesSearch, setSeriesSearch] = useState('')
  const [seriesStatus, setSeriesStatus] = useState('')
  const [revisionType, setRevisionType] = useState('')
  const [revisionState, setRevisionState] = useState('')
  const [reprintSearch, setReprintSearch] = useState('')
  const [reprintStatus, setReprintStatus] = useState('')
  const localize = (group: string, value: string) =>
    t(`operations.monitoring.${group}.${value}`, { defaultValue: value })
  const filteredSeries = series.filter(
    (item) =>
      (!seriesStatus || item.status === seriesStatus) &&
      (!seriesSearch || item.title.toLowerCase().includes(seriesSearch.toLowerCase()))
  )
  const filteredRevisions = revisions.filter(
    (item) =>
      (!revisionType || item.targetType === revisionType) &&
      (!revisionState || (revisionState === 'RESOLVED' ? item.isResolved : !item.isResolved))
  )
  const filteredReprints = reprints.filter(
    (item) =>
      (!reprintStatus || item.status === reprintStatus) &&
      (!reprintSearch || (item.series?.title ?? item.seriesId).toLowerCase().includes(reprintSearch.toLowerCase()))
  )

  return (
    <div className='space-y-6 pb-12'>
      <Link to='/dashboard/admin/operations' className='inline-flex items-center gap-2 text-xs font-bold text-primary'>
        <ArrowLeft className='size-4' />
        {t('operations.back')}
      </Link>
      <header>
        <div className='mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Search className='size-4' aria-hidden='true' />
          <span>{t('operations.monitoring.eyebrow')}</span>
        </div>
        <h1 className='text-xl font-bold tracking-tight text-foreground md:text-2xl'>
          {t('operations.monitoring.title')}
        </h1>
        <p className='mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground'>
          {t('operations.monitoring.subtitle')}
        </p>
      </header>

      {hasError && (
        <p className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive'>
          {t('operations.monitoring.loadError')}
        </p>
      )}

      {selectedReprint && (
        <section className='rounded-xl border border-primary/30 bg-card p-5 shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h2 className='font-bold text-foreground'>
              {selectedReprint.series?.title ?? t('operations.monitoring.unknownSeries')}
            </h2>
            <h2 className='font-bold text-foreground'>
              {selectedReprint.series?.title ?? t('operations.monitoring.unknownSeries')}
            </h2>
            <span className='rounded-full bg-secondary px-2 py-1 text-xs font-bold'>
              {localize('reprintStatuses', selectedReprint.status)}
            </span>
          </div>
          <p className='mt-2 text-xs text-muted-foreground'>{selectedReprint.reason}</p>
          <div className='mt-3 flex flex-wrap gap-2'>
            {selectedReprint.chapters.map((chapter, index) => (
              <span key={chapter.originalChapterId} className='rounded-md border border-border px-2 py-1 text-xs'>
                {t('operations.monitoring.reprintChapter', { number: index + 1 })} ·{' '}
                {localize('reprintChapterStatuses', chapter.status)}
                {t('operations.monitoring.reprintChapter', { number: index + 1 })} ·{' '}
                {localize('reprintChapterStatuses', chapter.status)}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <h2 className='font-bold text-foreground'>{t('operations.monitoring.deadlines')}</h2>
        <Form method='get' className='mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]'>
          <select
            name='seriesId'
            defaultValue={seriesId}
            className='h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-xs'
          >
            <option value=''>{t('operations.monitoring.selectSeries')}</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <select
            name='chapterId'
            defaultValue={chapterId}
            disabled={!seriesId}
            className='h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-xs disabled:opacity-60'
          >
            <option value=''>{t('operations.monitoring.selectChapter')}</option>
            {chapters.map((item) => (
              <option key={item.id} value={item.id}>
                {t('operations.monitoring.chapterOption', {
                  number: item.chapterNumber,
                  title: item.title || ''
                })}
              </option>
            ))}
          </select>
          <button className='h-10 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground'>
            {t('operations.monitoring.search')}
          </button>
        </Form>
        <ReadOnlyList
          items={deadlines.map((item) => ({
            id: item.id,
            title: `${localize('deadlineStatuses', item.status)} · ${item.requestedDeadline ?? '—'}`,
            description: item.reason ?? t('operations.monitoring.noReason')
          }))}
          empty={chapterId ? t('operations.monitoring.empty') : t('operations.monitoring.deadlineHint')}
        />
      </section>

      <div className='space-y-4'>
        <ReadOnlyPanel
          title={t('operations.monitoring.series')}
          filters={
            <FilterGrid>
              <input
                className={filterInput}
                value={seriesSearch}
                onChange={(event) => setSeriesSearch(event.target.value)}
                placeholder={t('operations.monitoring.filters.searchSeries')}
              />
              <select
                className={filterInput}
                value={seriesStatus}
                onChange={(event) => setSeriesStatus(event.target.value)}
              >
              <input
                className={filterInput}
                value={seriesSearch}
                onChange={(event) => setSeriesSearch(event.target.value)}
                placeholder={t('operations.monitoring.filters.searchSeries')}
              />
              <select
                className={filterInput}
                value={seriesStatus}
                onChange={(event) => setSeriesStatus(event.target.value)}
              >
                <option value=''>{t('operations.monitoring.filters.allStatuses')}</option>
                {[...new Set(series.map((item) => item.status))].map((value) => (
                  <option key={value} value={value}>
                    {localize('seriesStatuses', value)}
                  </option>
                ))}
                {[...new Set(series.map((item) => item.status))].map((value) => (
                  <option key={value} value={value}>
                    {localize('seriesStatuses', value)}
                  </option>
                ))}
              </select>
            </FilterGrid>
          }
          items={filteredSeries.slice(0, 20).map((item) => ({
            id: item.id,
            title: item.title,
            description: localize('seriesStatuses', item.status)
          }))}
          empty={t('operations.monitoring.empty')}
        />
        <ReadOnlyPanel
          title={t('operations.monitoring.revisions')}
          filters={
            <FilterGrid>
              <select
                className={filterInput}
                value={revisionType}
                onChange={(event) => setRevisionType(event.target.value)}
              >
              <select
                className={filterInput}
                value={revisionType}
                onChange={(event) => setRevisionType(event.target.value)}
              >
                <option value=''>{t('operations.monitoring.filters.allRevisionTypes')}</option>
                {[...new Set(revisions.map((item) => item.targetType))].map((value) => (
                  <option key={value} value={value}>
                    {localize('revisionTypes', value)}
                  </option>
                ))}
                {[...new Set(revisions.map((item) => item.targetType))].map((value) => (
                  <option key={value} value={value}>
                    {localize('revisionTypes', value)}
                  </option>
                ))}
              </select>
              <select
                className={filterInput}
                value={revisionState}
                onChange={(event) => setRevisionState(event.target.value)}
              >
              <select
                className={filterInput}
                value={revisionState}
                onChange={(event) => setRevisionState(event.target.value)}
              >
                <option value=''>{t('operations.monitoring.filters.allResolutionStates')}</option>
                <option value='OPEN'>{t('operations.monitoring.open')}</option>
                <option value='RESOLVED'>{t('operations.monitoring.resolved')}</option>
              </select>
            </FilterGrid>
          }
          items={filteredRevisions.map((item) => ({
            id: item.id,
            title: `${localize('revisionTypes', item.targetType)} · ${item.isResolved ? t('operations.monitoring.resolved') : t('operations.monitoring.open')}`,
            description: item.reason ?? t('operations.monitoring.noReason')
          }))}
          empty={t('operations.monitoring.empty')}
        />
        <ReadOnlyPanel
          title={t('operations.monitoring.reprints')}
          filters={
            <FilterGrid>
              <input
                className={filterInput}
                value={reprintSearch}
                onChange={(event) => setReprintSearch(event.target.value)}
                placeholder={t('operations.monitoring.filters.searchReprints')}
              />
              <select
                className={filterInput}
                value={reprintStatus}
                onChange={(event) => setReprintStatus(event.target.value)}
              >
              <input
                className={filterInput}
                value={reprintSearch}
                onChange={(event) => setReprintSearch(event.target.value)}
                placeholder={t('operations.monitoring.filters.searchReprints')}
              />
              <select
                className={filterInput}
                value={reprintStatus}
                onChange={(event) => setReprintStatus(event.target.value)}
              >
                <option value=''>{t('operations.monitoring.filters.allStatuses')}</option>
                {[...new Set(reprints.map((item) => item.status))].map((value) => (
                  <option key={value} value={value}>
                    {localize('reprintStatuses', value)}
                  </option>
                ))}
                {[...new Set(reprints.map((item) => item.status))].map((value) => (
                  <option key={value} value={value}>
                    {localize('reprintStatuses', value)}
                  </option>
                ))}
              </select>
            </FilterGrid>
          }
          items={filteredReprints.slice(0, 20).map((item) => ({
            id: item.id,
            title: item.series?.title ?? t('operations.monitoring.unknownSeries'),
            description: localize('reprintStatuses', item.status),
            href: `/dashboard/admin/operations/monitoring?reprintId=${encodeURIComponent(item.id)}`
          }))}
          empty={t('operations.monitoring.empty')}
        />
      </div>
    </div>
  )
}

interface ReadOnlyItem {
  id: string
  title: string
  description: string
  href?: string
}

function ReadOnlyPanel({
  title,
  filters,
  items,
  empty
}: {
  title: string
  filters?: ReactNode
  items: ReadOnlyItem[]
  empty: string
}) {
function ReadOnlyPanel({
  title,
  filters,
  items,
  empty
}: {
  title: string
  filters?: ReactNode
  items: ReadOnlyItem[]
  empty: string
}) {
  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <h2 className='font-bold text-foreground'>{title}</h2>
      {filters}
      <ReadOnlyList items={items} empty={empty} />
    </section>
  )
}

function FilterGrid({ children }: { children: ReactNode }) {
  return <div className='mt-3 grid gap-2 sm:grid-cols-2'>{children}</div>
}

const filterInput = 'h-9 min-w-0 rounded-md border border-input bg-background px-2 text-xs text-foreground'

function ReadOnlyList({ items, empty }: { items: ReadOnlyItem[]; empty: string }) {
  if (!items.length) return <p className='mt-3 text-xs text-muted-foreground'>{empty}</p>
  return (
    <div className='mt-3 max-h-[32rem] space-y-2 overflow-y-auto'>
      {items.map((item) =>
      {items.map((item) =>
        item.href ? (
          <Link
            key={item.id}
            to={item.href}
            className='block rounded-lg border border-border bg-background/50 p-3 hover:border-primary'
          >
            <p className='text-xs font-bold text-foreground'>{item.title}</p>
            <p className='mt-1 break-words text-xs text-muted-foreground'>{item.description}</p>
          </Link>
        ) : (
          <article key={item.id} className='rounded-lg border border-border bg-background/50 p-3'>
            <p className='text-xs font-bold text-foreground'>{item.title}</p>
            <p className='mt-1 break-words text-xs text-muted-foreground'>{item.description}</p>
          </article>
        )
      )}
      )}
    </div>
  )
}
