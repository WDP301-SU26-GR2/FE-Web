import { Landmark } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import type { ContractWithLatestRelations } from '~/api/manual/contract-latest'
import type { ContractResDtoOutput } from '~/api/model/contracts'

export function ContractDecisionBasis({
  contract,
  decisionPath
}: {
  contract: ContractResDtoOutput
  decisionPath?: string
}) {
  const { t, i18n } = useTranslation()
  const decision = (contract as ContractWithLatestRelations).boardDecision

  if (!decision) return null

  const seriesTitle = contract.series?.title ?? t('contractShared.decision.unknownSeries')
  const decisionLabel =
    decision.decisionType === 'SERIALIZATION'
      ? t('contractShared.decision.serializationSummary', { series: seriesTitle })
      : t('contractShared.decision.genericSummary', {
          type: t(`contractShared.decision.types.${decision.decisionType}`, {
            defaultValue: decision.decisionType ?? t('contractShared.decision.unknownDecision')
          }),
          series: seriesTitle
        })
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='flex items-center gap-2 font-bold text-foreground'>
            <Landmark className='size-5 text-primary' />
            {t('contractShared.decision.title')}
          </h2>
          <p className='mt-2 text-sm font-semibold text-foreground'>{decisionLabel}</p>
        </div>
        <span className='rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground'>
          {t(`contractShared.decision.results.${decision.result}`, { defaultValue: decision.result ?? '—' })}
        </span>
      </div>
      <dl className='mt-4 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2'>
        <div>
          <dt className='text-xs text-muted-foreground'>{t('contractShared.decision.session')}</dt>
          <dd className='mt-1 font-bold text-foreground'>{decision.boardSession.title}</dd>
          <dd className='mt-1 text-xs text-muted-foreground'>
            {dateFormatter.format(new Date(decision.boardSession.startTime))}
          </dd>
        </div>
        <div>
          <dt className='text-xs text-muted-foreground'>{t('contractShared.decision.decidedAt')}</dt>
          <dd className='mt-1 font-bold text-foreground'>
            {decision.decidedAt
              ? dateFormatter.format(new Date(decision.decidedAt))
              : t('contractShared.decision.notFinalized')}
          </dd>
        </div>
      </dl>
      {decisionPath && (
        <Link
          to={`${decisionPath}/${decision.id}`}
          className='mt-4 inline-flex text-sm font-bold text-primary hover:underline'
        >
          {t('contractShared.decision.openDecision')}
        </Link>
      )}
    </section>
  )
}
