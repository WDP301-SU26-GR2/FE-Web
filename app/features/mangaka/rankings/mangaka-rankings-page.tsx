import { useTranslation } from 'react-i18next'
import { ArrowLeft, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { FilterChip } from '~/shared/components/pagination'
import {
  PUBLICATION_TYPE_OPTIONS,
  useMangakaRankings
} from './use-mangaka-rankings'
import { useSeriesList } from '../series/use-series-list'
import { RankingTable } from './components/ranking-table'
import { SeriesTrendChart } from './components/series-trend-chart'
import type { VotePeriodsResDtoOutputItemsItem } from '~/api/model/survey/votePeriodsResDtoOutputItemsItem'

/**
 * Mangaka's ranking page — `/dashboard/mangaka/rankings`.
 *
 * Three independent sections (per §9 of FE-API-Guide-v3):
 *
 *  1. **Latest reflected period** — `GET /vote/results/latest?publicationType=…`
 *     Guest-public endpoint, so all internal roles see the same view as the
 *     magazine reader. Filter chips switch between overall / weekly / monthly
 *     / irregular (Spec 15.2).
 *
 *  2. **Historical periods** — dropdown of REFLECTED periods (from
 *     `GET /vote/periods`). Picking one fires `GET /vote/results?surveyPeriodId=…`
 *     and re-uses `<RankingTable>` for the layout.
 *
 *  3. **My series trend** — `GET /rankings?seriesId=…&periods=12` (PB-04).
 *     Server-scoped: Mangaka can only chart series they own (403 otherwise).
 *     The series picker is fed by the same `useSeriesList` hook the dashboard
 *     already uses; for v1 we accept the limited page-1 visibility (4 series)
 *     and revisit with a searchable dropdown if user feedback warrants it.
 */
export function MangakaRankingsPage() {
  const { t } = useTranslation('mangaka')

  const {
    latest,
    periods,
    trend,
    isLoading,
    error,
    publicationType,
    setPublicationType,
    selectedPeriodId,
    setSelectedPeriodId,
    periodResults,
    isLoadingPeriod,
    selectedSeriesId,
    setSelectedSeriesId,
    refresh
  } = useMangakaRankings()

  const { items: mySeries } = useSeriesList()

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <TrendingUp className='h-5 w-5 text-primary' />
            <h1 className='text-2xl font-bold tracking-tight'>{t('rankings.title')}</h1>
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>{t('rankings.subtitle')}</p>
        </div>
        <div className='flex items-center gap-2'>
          <a
            href='/dashboard/mangaka'
            className='inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted'
          >
            <ArrowLeft className='h-3.5 w-3.5' />
            {t('rankings.back')}
          </a>
          <button
            type='button'
            onClick={refresh}
            disabled={isLoading}
            className='inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            {t('rankings.refresh')}
          </button>
        </div>
      </div>

      {/* Error banner (latest + periods section) */}
      {error && (
        <div
          role='alert'
          className='flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive'
        >
          <span>{extractApiErrorMessage({ message: error }, t('rankings.error.loadFailed'))}</span>
          <button
            type='button'
            onClick={refresh}
            className='inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-bold hover:bg-destructive/10 cursor-pointer'
          >
            <RefreshCw className='h-3 w-3' />
            {t('rankings.error.retry')}
          </button>
        </div>
      )}

      {/* 1. Latest reflected period */}
      <Section
        title={t('rankings.latest.title')}
        description={t('rankings.latest.description')}
      >
        <div className='flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm'>
          <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
            {t('rankings.publicationType.label')}
          </span>
          {PUBLICATION_TYPE_OPTIONS.map((opt) => (
            <FilterChip
              key={opt}
              active={publicationType === opt}
              onClick={() => setPublicationType(opt)}
              label={t(`rankings.publicationType.${opt}`)}
            />
          ))}
        </div>
        <RankingTable
          items={latest?.results ?? []}
          emptyLabel={isLoading ? t('rankings.latest.loading') : t('rankings.latest.empty')}
        />
        {latest?.period && (
          <p className='text-xs text-muted-foreground'>
            {t('rankings.latest.periodLabel', {
              issue: latest.period.issueNumber ?? '—',
              reflected: latest.period.reflectedIssueNumber ?? '—'
            })}
          </p>
        )}
      </Section>

      {/* 2. Historical period picker */}
      <Section
        title={t('rankings.history.title')}
        description={t('rankings.history.description')}
      >
        <PeriodPicker
          periods={periods}
          selectedId={selectedPeriodId}
          onSelect={setSelectedPeriodId}
        />
        {selectedPeriodId ? (
          <RankingTable
            items={periodResults?.results ?? []}
            emptyLabel={isLoadingPeriod ? t('rankings.history.loading') : t('rankings.history.empty')}
          />
        ) : (
          <div className='rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center'>
            <p className='text-sm font-semibold text-foreground'>{t('rankings.history.prompt')}</p>
          </div>
        )}
      </Section>

      {/* 3. My series trend */}
      <Section
        title={t('rankings.trend.title')}
        description={t('rankings.trend.description')}
      >
        <SeriesPicker
          series={mySeries.map((s) => ({ id: s.id, title: s.title }))}
          selectedId={selectedSeriesId}
          onSelect={setSelectedSeriesId}
        />
        {selectedSeriesId ? (
          trend.length > 0 ? (
            <SeriesTrendChart items={trend} />
          ) : (
            <div className='rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center'>
              <p className='text-sm font-semibold text-foreground'>{t('rankings.trend.empty')}</p>
            </div>
          )
        ) : (
          <div className='rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center'>
            <div className='mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground'>
              <AlertTriangle className='h-4 w-4' />
            </div>
            <p className='mt-3 text-sm font-semibold text-foreground'>{t('rankings.trend.prompt')}</p>
            <p className='mt-1 text-xs text-muted-foreground'>{t('rankings.trend.promptHint')}</p>
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({
  title,
  description,
  children
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className='space-y-4'>
      <div>
        <h2 className='text-base font-bold tracking-tight text-foreground'>{title}</h2>
        <p className='mt-0.5 text-xs text-muted-foreground'>{description}</p>
      </div>
      <div className='space-y-3'>{children}</div>
    </section>
  )
}

function PeriodPicker({
  periods,
  selectedId,
  onSelect
}: {
  periods: VotePeriodsResDtoOutputItemsItem[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { t, i18n } = useTranslation('mangaka')
  const locale = i18n.language

  if (periods.length === 0) {
    return (
      <div className='rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm'>
        {t('rankings.history.noPeriods')}
      </div>
    )
  }

  return (
    <div className='flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm'>
      <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
        {t('rankings.history.label')}
      </span>
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className='min-w-[180px] rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer'
      >
        <option value=''>{t('rankings.history.selectPlaceholder')}</option>
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {formatPeriodLabel(p, locale)}
          </option>
        ))}
      </select>
    </div>
  )
}

function formatPeriodLabel(p: VotePeriodsResDtoOutputItemsItem, locale: string): string {
  const start = p.startDate ? new Date(p.startDate) : null
  const end = p.endDate ? new Date(p.endDate) : null
  const fmt = (d: Date | null): string =>
    d && !Number.isNaN(d.getTime())
      ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(d)
      : '—'
  const issue = p.issueNumber ?? '—'
  return `#${issue} (${fmt(start)} – ${fmt(end)})`
}

function SeriesPicker({
  series,
  selectedId,
  onSelect
}: {
  series: { id: string; title: string }[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { t } = useTranslation('mangaka')

  if (series.length === 0) {
    return (
      <div className='rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm'>
        {t('rankings.trend.noSeries')}
      </div>
    )
  }

  return (
    <div className='flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm'>
      <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
        {t('rankings.trend.label')}
      </span>
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className='min-w-[200px] rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer'
      >
        <option value=''>{t('rankings.trend.selectPlaceholder')}</option>
        {series.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>
    </div>
  )
}
