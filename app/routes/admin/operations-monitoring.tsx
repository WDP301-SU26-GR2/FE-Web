import { ArrowLeft, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Form, Link } from 'react-router'
import { useState, type ReactNode } from 'react'

import type { DeadlineRequestListResDtoOutputItemsItem } from '~/api/model/deadline-requests'
import type { ReprintRequestResDtoOutput } from '~/api/model/reprint-requests'
import type { RevisionRequestListResDtoOutputItemsItem } from '~/api/model/revision'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { deadlineControllerList } from '~/api/operations/deadline-requests/deadline-requests'
import { reprintRequestControllerFindAll, reprintRequestControllerFindById } from '~/api/operations/reprint-requests/reprint-requests'
import { revisionControllerList } from '~/api/operations/revision/revision'
import { seriesControllerListSeries } from '~/api/operations/series/series'

interface MonitoringData {
  series: SeriesListResDtoOutputItemsItem[]
  revisions: RevisionRequestListResDtoOutputItemsItem[]
  reprints: ReprintRequestResDtoOutput[]
  selectedReprint: ReprintRequestResDtoOutput | null
  deadlines: DeadlineRequestListResDtoOutputItemsItem[]
  chapterId: string
  hasError: boolean
}

export async function clientLoader({ request }: { request: Request }): Promise<MonitoringData> {
  const chapterId = new URL(request.url).searchParams.get('chapterId')?.trim() ?? ''
  const reprintId = new URL(request.url).searchParams.get('reprintId')?.trim() ?? ''
  const [seriesResult, revisionResult, reprintResult, deadlineResult, reprintDetailResult] = await Promise.allSettled([
    seriesControllerListSeries({ limit: 100, offset: 0 }),
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

  return {
    series: seriesOk ? seriesResult.value.data.items : [],
    revisions:
      revisionResult.status === 'fulfilled' && revisionResult.value.status === 200
        ? revisionResult.value.data.items
        : [],
    reprints: reprintOk ? reprintResult.value.data : [],
    selectedReprint:
      reprintId && reprintDetailResult.status === 'fulfilled' && reprintDetailResult.value?.status === 200
        ? reprintDetailResult.value.data
        : null,
    deadlines:
      chapterId && deadlineResult.status === 'fulfilled' && deadlineResult.value?.status === 200
        ? deadlineResult.value.data.items
        : [],
    chapterId,
    hasError: !seriesOk || !revisionOk || !reprintOk || !deadlineOk
  }
}

export default function AdminOperationsMonitoringRoute({ loaderData }: { loaderData: MonitoringData }) {
  const { t } = useTranslation('admin')
  const { series, revisions, reprints, selectedReprint, deadlines, chapterId, hasError } = loaderData
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
      <Link
        to='/dashboard/admin/operations'
        className='inline-flex items-center gap-2 text-sm font-bold text-primary'
      >
        <ArrowLeft className='size-4' />
        {t('operations.back')}
      </Link>
      <header>
        <div className='mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Search className='size-4' aria-hidden='true' />
          <span>{t('operations.monitoring.eyebrow')}</span>
        </div>
        <h1 className='text-2xl font-bold tracking-tight text-foreground md:text-3xl'>
          {t('operations.monitoring.title')}
        </h1>
        <p className='mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground'>
          {t('operations.monitoring.subtitle')}
        </p>
      </header>

      {hasError && (
        <p className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
          {t('operations.monitoring.loadError')}
        </p>
      )}

      {selectedReprint && (
        <section className='rounded-xl border border-primary/30 bg-card p-5 shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h2 className='font-bold text-foreground'>{selectedReprint.series?.title ?? t('operations.monitoring.unknownSeries')}</h2>
            <span className='rounded-full bg-secondary px-2 py-1 text-xs font-bold'>
              {localize('reprintStatuses', selectedReprint.status)}
            </span>
          </div>
          <p className='mt-2 text-sm text-muted-foreground'>{selectedReprint.reason}</p>
          <div className='mt-3 flex flex-wrap gap-2'>
            {selectedReprint.chapters.map((chapter, index) => (
              <span key={chapter.originalChapterId} className='rounded-md border border-border px-2 py-1 text-xs'>
                {t('operations.monitoring.reprintChapter', { number: index + 1 })} · {localize('reprintChapterStatuses', chapter.status)}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <h2 className='font-bold text-foreground'>{t('operations.monitoring.deadlines')}</h2>
        <Form method='get' className='mt-3 flex flex-col gap-2 sm:flex-row'>
          <input
            name='chapterId'
            defaultValue={chapterId}
            required
            className='h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm'
            placeholder={t('operations.monitoring.chapterId')}
          />
          <button className='h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground'>
            {t('operations.monitoring.search')}
          </button>
        </Form>
        <ReadOnlyList
          items={deadlines.map((item) => ({
            id: item.id,
            title: `${localize('deadlineStatuses', item.status)} · ${item.requestedDeadline ?? '—'}`,
            description: item.reason ?? item.chapterId ?? ''
          }))}
          empty={chapterId ? t('operations.monitoring.empty') : t('operations.monitoring.deadlineHint')}
        />
      </section>

      <div className='grid gap-4 xl:grid-cols-3'>
        <ReadOnlyPanel
          title={t('operations.monitoring.series')}
          filters={
            <FilterGrid>
              <input className={filterInput} value={seriesSearch} onChange={(event) => setSeriesSearch(event.target.value)} placeholder={t('operations.monitoring.filters.searchSeries')} />
              <select className={filterInput} value={seriesStatus} onChange={(event) => setSeriesStatus(event.target.value)}>
                <option value=''>{t('operations.monitoring.filters.allStatuses')}</option>
                {[...new Set(series.map((item) => item.status))].map((value) => <option key={value} value={value}>{localize('seriesStatuses', value)}</option>)}
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
              <select className={filterInput} value={revisionType} onChange={(event) => setRevisionType(event.target.value)}>
                <option value=''>{t('operations.monitoring.filters.allRevisionTypes')}</option>
                {[...new Set(revisions.map((item) => item.targetType))].map((value) => <option key={value} value={value}>{localize('revisionTypes', value)}</option>)}
              </select>
              <select className={filterInput} value={revisionState} onChange={(event) => setRevisionState(event.target.value)}>
                <option value=''>{t('operations.monitoring.filters.allResolutionStates')}</option>
                <option value='OPEN'>{t('operations.monitoring.open')}</option>
                <option value='RESOLVED'>{t('operations.monitoring.resolved')}</option>
              </select>
            </FilterGrid>
          }
          items={filteredRevisions.map((item) => ({
            id: item.id,
            title: `${localize('revisionTypes', item.targetType)} · ${item.isResolved ? t('operations.monitoring.resolved') : t('operations.monitoring.open')}`,
            description: item.reason ?? item.targetId
          }))}
          empty={t('operations.monitoring.empty')}
        />
        <ReadOnlyPanel
          title={t('operations.monitoring.reprints')}
          filters={
            <FilterGrid>
              <input className={filterInput} value={reprintSearch} onChange={(event) => setReprintSearch(event.target.value)} placeholder={t('operations.monitoring.filters.searchReprints')} />
              <select className={filterInput} value={reprintStatus} onChange={(event) => setReprintStatus(event.target.value)}>
                <option value=''>{t('operations.monitoring.filters.allStatuses')}</option>
                {[...new Set(reprints.map((item) => item.status))].map((value) => <option key={value} value={value}>{localize('reprintStatuses', value)}</option>)}
              </select>
            </FilterGrid>
          }
          items={filteredReprints.slice(0, 20).map((item) => ({
            id: item.id,
            title: item.series?.title ?? item.seriesId,
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

function ReadOnlyPanel({ title, filters, items, empty }: { title: string; filters?: ReactNode; items: ReadOnlyItem[]; empty: string }) {
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
  if (!items.length) return <p className='mt-3 text-sm text-muted-foreground'>{empty}</p>
  return (
    <div className='mt-3 max-h-[32rem] space-y-2 overflow-y-auto'>
      {items.map((item) => (
        item.href ? (
          <Link key={item.id} to={item.href} className='block rounded-lg border border-border bg-background/50 p-3 hover:border-primary'>
            <p className='text-sm font-bold text-foreground'>{item.title}</p>
            <p className='mt-1 break-words text-xs text-muted-foreground'>{item.description}</p>
          </Link>
        ) : (
          <article key={item.id} className='rounded-lg border border-border bg-background/50 p-3'>
            <p className='text-sm font-bold text-foreground'>{item.title}</p>
            <p className='mt-1 break-words text-xs text-muted-foreground'>{item.description}</p>
            <p className='mt-1 break-all font-mono text-[10px] text-muted-foreground'>{item.id}</p>
          </article>
        )
      ))}
    </div>
  )
}
