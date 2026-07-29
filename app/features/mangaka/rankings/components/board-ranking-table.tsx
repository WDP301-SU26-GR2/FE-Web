import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { BoardRankingListResDtoOutputItemsItem } from '~/api/model/survey/boardRankingListResDtoOutputItemsItem'
import type { BoardRankingListResDtoOutputItemsItemRiskLevel } from '~/api/model/survey/boardRankingListResDtoOutputItemsItemRiskLevel'
import { cn } from '~/shared/lib/cn'

interface BoardRankingTableProps {
  items: BoardRankingListResDtoOutputItemsItem[]
  ownSeriesTitles: Record<string, string>
  emptyLabel: string
}

/** Read-only internal board used to compare an owned series with its magazine. */
export function BoardRankingTable({ items, ownSeriesTitles, emptyLabel }: BoardRankingTableProps) {
  const { t, i18n } = useTranslation('mangaka')

  if (items.length === 0) {
    return (
      <div className='rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center'>
        <p className='text-sm font-semibold text-foreground'>{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className='overflow-x-auto rounded-xl border border-border bg-card shadow-sm'>
      <table className='min-w-[780px] w-full text-sm'>
        <caption className='sr-only'>{t('rankings.board.title')}</caption>
        <thead className='border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
          <tr>
            <th scope='col' className='w-16 px-4 py-2.5 text-left'>
              {t('rankings.board.table.rank')}
            </th>
            <th scope='col' className='px-4 py-2.5 text-left'>
              {t('rankings.board.table.series')}
            </th>
            <th scope='col' className='w-21 px-4 py-2.5 text-right'>
              {t('rankings.board.table.votes')}
            </th>
            <th scope='col' className='w-24 px-4 py-2.5 text-right'>
              {t('rankings.board.table.score')}
            </th>
            <th scope='col' className='w-26 px-4 py-2.5 text-right'>
              {t('rankings.board.table.change')}
            </th>
            <th scope='col' className='w-28 px-4 py-2.5 text-right'>
              {t('rankings.board.table.risk')}
            </th>
          </tr>
        </thead>
        <tbody className='divide-y divide-border'>
          {items.map((item) => {
            const ownedTitle = ownSeriesTitles[item.seriesId]
            return (
              <tr key={item.seriesId} className={cn(ownedTitle && 'bg-secondary/40')}>
                <td className='px-4 py-2.5 font-mono text-base font-bold text-foreground'>
                  #{item.rankPosition ?? '—'}
                </td>
                <td className='max-w-0 px-4 py-2.5'>
                  <span className='block truncate font-semibold text-foreground' title={ownedTitle}>
                    {ownedTitle ?? t('rankings.board.otherSeries')}
                  </span>
                  {ownedTitle && (
                    <span className='text-xs text-muted-foreground'>{t('rankings.board.yourSeries')}</span>
                  )}
                </td>
                <td className='px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-foreground'>
                  {new Intl.NumberFormat(i18n.language).format(item.voteCount)}
                </td>
                <td className='px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground'>
                  {new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(item.normalizedScore)}
                </td>
                <td className='px-4 py-2.5 text-right'>
                  <RankChange change={item.rankChange} />
                </td>
                <td className='px-4 py-2.5 text-right'>
                  <RiskBadge level={item.riskLevel} atRisk={item.isAtRisk} reliable={item.isReliable} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RankChange({ change }: { change: number | null }) {
  const { t } = useTranslation('mangaka')
  if (change === null || change === 0) {
    return (
      <span className='inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground'>
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
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-destructive/30 bg-destructive/10 text-destructive'
      )}
    >
      {isUp ? <ArrowUp className='h-3 w-3' /> : <ArrowDown className='h-3 w-3' />}
      {Math.abs(change)}
    </span>
  )
}

function RiskBadge({
  level,
  atRisk,
  reliable
}: {
  level: BoardRankingListResDtoOutputItemsItemRiskLevel
  atRisk: boolean
  reliable: boolean
}) {
  const { t } = useTranslation('mangaka')
  const tone = atRisk ? 'border-warning/30 bg-warning/10 text-warning' : 'border-border bg-muted text-muted-foreground'
  const label = reliable ? t(`rankings.riskLevel.${level}`) : t('rankings.board.unreliable')
  return <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', tone)}>{label}</span>
}
