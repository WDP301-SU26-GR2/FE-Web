import { useTranslation } from 'react-i18next'

import { cn } from '~/shared/lib/cn'
import type { BoardRankingListResDtoOutputItemsItem } from '~/api/model/survey/boardRankingListResDtoOutputItemsItem'
import type { BoardRankingListResDtoOutputItemsItemRiskLevel } from '~/api/model/survey/boardRankingListResDtoOutputItemsItemRiskLevel'

type SeriesTrendChartProps = {
  items: BoardRankingListResDtoOutputItemsItem[]
}

const CHART_WIDTH = 720
const CHART_HEIGHT = 240
const PADDING_X = 36
const PADDING_Y = 28

const RISK_TONE: Record<BoardRankingListResDtoOutputItemsItemRiskLevel, string> = {
  NONE: 'border-border bg-muted/40 text-muted-foreground',
  LOW: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
  MEDIUM: 'border-orange-500/30 bg-orange-500/10 text-orange-700',
  SEVERE: 'border-rose-500/30 bg-rose-500/10 text-rose-700'
}

/**
 * Inline SVG line chart for a series' rank position over the last N periods.
 *
 * Why no chart library? Per the project's AGENTS.md §14, adding a charting
 * dep needs explicit user buy-in; for a single 12-point series trend, a hand
 * rolled SVG keeps the bundle slim and lets us colour points by risk level
 * without writing a wrapper.
 *
 * Inputs come from `GET /rankings?seriesId=…` (PB-04). Items are returned
 * newest-last by the BE (per the spec example), so we render chronologically
 * left → right. Missing rank positions are bridged by simply not plotting
 * them — we keep `path d` continuous only across points that have a rank.
 */
export function SeriesTrendChart({ items }: SeriesTrendChartProps) {
  const { t, i18n } = useTranslation('mangaka')

  if (items.length === 0) {
    return (
      <div className='rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center'>
        <p className='text-sm font-semibold text-foreground'>{t('rankings.trend.empty')}</p>
      </div>
    )
  }

  const points = items.filter((it) => typeof it.rankPosition === 'number') as Array<
    BoardRankingListResDtoOutputItemsItem & { rankPosition: number }
  >

  if (points.length === 0) {
    return (
      <div className='rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center'>
        <p className='text-sm font-semibold text-foreground'>{t('rankings.trend.noRanks')}</p>
      </div>
    )
  }

  // Compute axis ranges. We invert Y so rank #1 is at the top (the user's
  // mental model: higher rank → upper line).
  const ranks = points.map((p) => p.rankPosition)
  const minRank = Math.min(...ranks)
  const maxRank = Math.max(...ranks)
  const rankSpan = Math.max(1, maxRank - minRank)

  const xFor = (idx: number): number => {
    if (points.length === 1) return PADDING_X + (CHART_WIDTH - 2 * PADDING_X) / 2
    const ratio = idx / (points.length - 1)
    return PADDING_X + ratio * (CHART_WIDTH - 2 * PADDING_X)
  }
  const yFor = (rank: number): number => {
    // inverted: rank = minRank → bottom; rank = maxRank → top
    const ratio = (rank - minRank) / rankSpan
    return CHART_HEIGHT - PADDING_Y - ratio * (CHART_HEIGHT - 2 * PADDING_Y)
  }

  const path = points
    .map((p, idx) => {
      const x = xFor(idx).toFixed(2)
      const y = yFor(p.rankPosition).toFixed(2)
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  // Y-axis ticks: at most 4 (top / 1/3 / 2/3 / bottom)
  const tickCount = Math.min(4, rankSpan + 1)
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const t = i / Math.max(1, tickCount - 1)
    return Math.round(maxRank - t * rankSpan)
  })

  return (
    <div className='space-y-4'>
      <div className='overflow-x-auto rounded-xl border border-border bg-card p-4 shadow-sm'>
        <svg
          role='img'
          aria-label={t('rankings.trend.chartLabel')}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className='block h-auto w-full min-w-[480px]'
        >
          {/* Gridlines + Y axis labels */}
          {ticks.map((tick) => {
            const y = yFor(tick).toFixed(2)
            return (
              <g key={`tick-${tick}`}>
                <line
                  x1={PADDING_X}
                  x2={CHART_WIDTH - PADDING_X}
                  y1={y}
                  y2={y}
                  className='stroke-border'
                  strokeDasharray='3 3'
                />
                <text x={PADDING_X - 6} y={y} dy='0.32em' textAnchor='end' className='fill-muted-foreground text-[10px]'>
                  #{tick}
                </text>
              </g>
            )
          })}

          {/* Line */}
          <path d={path} className='fill-none stroke-primary' strokeWidth={2.5} strokeLinejoin='round' strokeLinecap='round' />

          {/* Points */}
          {points.map((p, idx) => {
            const x = xFor(idx)
            const y = yFor(p.rankPosition)
            const tone = RISK_TONE[p.riskLevel]
            const label = `${t('rankings.trend.tooltip', {
              rank: p.rankPosition,
              date: formatTooltipDate(p.recordedAt, i18n.language),
              votes: p.voteCount
            })}`
            return (
              <g key={`${p.seriesId}-${idx}`}>
                <circle cx={x} cy={y} r={5} className={cn('stroke-2 fill-card', tone)} />
                <title>{label}</title>
              </g>
            )
          })}

          {/* X axis baseline */}
          <line
            x1={PADDING_X}
            x2={CHART_WIDTH - PADDING_X}
            y1={CHART_HEIGHT - PADDING_Y}
            y2={CHART_HEIGHT - PADDING_Y}
            className='stroke-border'
          />
          <text
            x={CHART_WIDTH - PADDING_X}
            y={CHART_HEIGHT - PADDING_Y + 18}
            textAnchor='end'
            className='fill-muted-foreground text-[10px]'
          >
            {formatTooltipDate(points[points.length - 1]!.recordedAt, i18n.language)}
          </text>
          <text
            x={PADDING_X}
            y={CHART_HEIGHT - PADDING_Y + 18}
            textAnchor='start'
            className='fill-muted-foreground text-[10px]'
          >
            {formatTooltipDate(points[0]!.recordedAt, i18n.language)}
          </text>
        </svg>
      </div>

      {/* Risk legend */}
      <div className='flex flex-wrap items-center gap-2 text-[11px]'>
        {(Object.keys(RISK_TONE) as BoardRankingListResDtoOutputItemsItemRiskLevel[]).map((level) => (
          <span
            key={level}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold',
              RISK_TONE[level]
            )}
          >
            <span className='h-1.5 w-1.5 rounded-full bg-current' />
            {t(`rankings.riskLevel.${level}`)}
          </span>
        ))}
      </div>

      {/* Per-period rows */}
      <ul className='divide-y divide-border overflow-hidden rounded-xl border border-border bg-card'>
        {items.map((item, idx) => (
          <li
            key={`${item.seriesId}-${idx}-${item.recordedAt}`}
            className='grid grid-cols-[60px_1fr_80px_100px] items-center gap-3 px-4 py-2.5 text-xs'
          >
            <span className='font-mono font-bold text-foreground'>#{item.rankPosition ?? '—'}</span>
            <span className='truncate text-muted-foreground'>
              {formatTooltipDate(item.recordedAt, i18n.language)}
            </span>
            <span className='font-mono text-right text-foreground tabular-nums'>{item.voteCount}</span>
            <span className='flex justify-end'>
              <RiskChip level={item.riskLevel} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RiskChip({ level }: { level: BoardRankingListResDtoOutputItemsItemRiskLevel }) {
  const { t } = useTranslation('mangaka')
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold',
        RISK_TONE[level]
      )}
    >
      {t(`rankings.riskLevel.${level}`)}
    </span>
  )
}

function formatTooltipDate(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(d)
}
