import { Landmark } from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import type { ContractResDtoOutput } from '~/api/model/contracts'
import type { ContractWithLatestRelations } from '~/api/manual/contract-latest'

export function ContractDecisionBasis({
  contract,
  decisionPath
}: {
  contract: ContractResDtoOutput
  decisionPath?: string
}) {
  const { t, i18n } = useTranslation('editor')
  const decision = (contract as ContractWithLatestRelations).boardDecision

  if (!decision) return null

  const seriesTitle = contract.series?.title ?? t('contractDecision.unknownSeries')
  const decisionLabel =
    decision.decisionType === 'SERIALIZATION'
      ? t('contractDecision.serializationSummary', { series: seriesTitle })
      : t('contractDecision.genericSummary', {
          type: t(`board.decisionTypeLabels.${decision.decisionType}`, {
            defaultValue: decision.decisionType ?? t('contractDecision.unknownDecision')
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
            {t('contractDecision.title')}
          </h2>
          <p className='mt-2 text-sm font-semibold text-foreground'>{decisionLabel}</p>
        </div>
        <span className='rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground'>
          {t(`contractDecision.results.${decision.result}`, { defaultValue: decision.result ?? '—' })}
        </span>
      </div>
      <dl className='mt-4 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2'>
        <div>
          <dt className='text-xs text-muted-foreground'>{t('contractDecision.session')}</dt>
          <dd className='mt-1 font-bold text-foreground'>{decision.boardSession.title}</dd>
          <dd className='mt-1 text-xs text-muted-foreground'>{dateFormatter.format(new Date(decision.boardSession.startTime))}</dd>
        </div>
        <div>
          <dt className='text-xs text-muted-foreground'>{t('contractDecision.decidedAt')}</dt>
          <dd className='mt-1 font-bold text-foreground'>
            {decision.decidedAt ? dateFormatter.format(new Date(decision.decidedAt)) : t('contractDecision.notFinalized')}
          </dd>
        </div>
      </dl>
      {decisionPath && (
        <Link to={`${decisionPath}/${decision.id}`} className='mt-4 inline-flex text-sm font-bold text-primary hover:underline'>
          {t('contractDecision.openDecision')}
        </Link>
      )}
    </section>
  )
}
