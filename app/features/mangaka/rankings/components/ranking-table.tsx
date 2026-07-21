import { useTranslation } from 'react-i18next'

import { cn } from '~/shared/lib/cn'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { LatestVoteResultsResDtoOutputResultsItem } from '~/api/model/survey/latestVoteResultsResDtoOutputResultsItem'
import type { VoteResultsResDtoOutputResultsItem } from '~/api/model/survey/voteResultsResDtoOutputResultsItem'
import type { VoteResultsResDtoOutputResultsItemPublicationType } from '~/api/model/survey/voteResultsResDtoOutputResultsItemPublicationType'

type AnyResultsItem = LatestVoteResultsResDtoOutputResultsItem | VoteResultsResDtoOutputResultsItem

type RankingTableProps = {
  items: AnyResultsItem[]
  /** Empty state message when items.length === 0. */
  emptyLabel: string
}

/**
 * Public ranking table — used for both the latest REFLECTED period and any
 * historical period the user selects. Renders the three columns a guest
 * would see: rank position, series title, vote count, rank change.
 *
 * `rankPosition` is the position on the OVERALL board (per §9 — the
 * publicationType filter is a view-side sub-table, not a renumbering).
 * We therefore use the value as-is.
 */
export function RankingTable({ items, emptyLabel }: RankingTableProps) {
  const { t, i18n } = useTranslation('mangaka')

  if (items.length === 0) {
    return (
      <div className='rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center'>
        <p className='text-sm font-semibold text-foreground'>{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <div className='grid grid-cols-[64px_minmax(0,1fr)_92px_88px_110px] items-center gap-3 border-b border-border px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
        <span>{t('rankings.table.columns.rank')}</span>
        <span>{t('rankings.table.columns.series')}</span>
        <span>{t('rankings.table.columns.publicationType')}</span>
        <span className='text-right'>{t('rankings.table.columns.votes')}</span>
        <span className='text-right'>{t('rankings.table.columns.change')}</span>
      </div>
      <ul className='divide-y divide-border'>
        {items.map((item) => (
          <li
            key={item.seriesId}
            className='grid grid-cols-[64px_minmax(0,1fr)_92px_88px_110px] items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/40'
          >
            <span className='font-mono text-base font-bold text-foreground'>
              {item.rankPosition ?? '—'}
            </span>
            <span
              className={cn(
                'truncate font-semibold',
                item.seriesTitle ? 'text-foreground' : 'italic text-muted-foreground'
              )}
              title={item.seriesTitle ?? item.seriesId}
            >
              {item.seriesTitle ?? t('rankings.table.deletedSeries')}
            </span>
            <span>
              <PublicationTypeBadge value={item.publicationType} />
            </span>
            <span className='text-right font-mono text-sm font-semibold tabular-nums text-foreground'>
              {formatNumber(item.voteCount, i18n.language)}
            </span>
            <span className='flex justify-end'>
              <RankChangeBadge change={item.rankChange} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value)
}

const PUBLICATION_TYPE_LABEL: Record<NonNullable<VoteResultsResDtoOutputResultsItemPublicationType>, string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  IRREGULAR: 'Irregular'
}

function PublicationTypeBadge({
  value
}: {
  value: VoteResultsResDtoOutputResultsItemPublicationType
}) {
  const { t } = useTranslation('mangaka')
  if (!value) return <span className='text-muted-foreground'>—</span>
  return (
    <span className='inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground'>
      {t(`rankings.publicationType.${value}`, { defaultValue: PUBLICATION_TYPE_LABEL[value] })}
    </span>
  )
}

function RankChangeBadge({ change }: { change: number | null }) {
  const { t } = useTranslation('mangaka')
  if (change === null || change === 0) {
    return (
      <span className='inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold text-muted-foreground'>
        <Minus className='h-3 w-3' />
        {t('rankings.table.changeStable')}
      </span>
    )
  }
  const isUp = change > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
        isUp
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
          : 'border-rose-500/20 bg-rose-500/10 text-rose-600'
      )}
    >
      {isUp ? <ArrowUp className='h-3 w-3' /> : <ArrowDown className='h-3 w-3' />}
      {Math.abs(change)}
    </span>
  )
}
