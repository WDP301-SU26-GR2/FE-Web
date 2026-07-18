import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ContractResDtoOutput } from '~/api/model/contracts'
import { BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'

export function BoardContractsPage({ contracts, hasError }: { contracts: ContractResDtoOutput[]; hasError: boolean }) {
  const { t } = useTranslation('board')
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('contracts.title')} description={t('contracts.description')} />
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-4 md:grid-cols-2'>
        {contracts.map((contract) => (
          <Link
            key={contract.id}
            to={`/dashboard/board/contracts/${contract.id}`}
            className='rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary'
          >
            <div className='flex justify-between gap-3'>
              <strong>{contract.contractType}</strong>
              <StatusBadge value={contract.status} />
            </div>
            <p className='mt-2 text-xs text-muted-foreground'>
              {t('contracts.series')}: {contract.seriesId}
            </p>
            <p className='mt-3 text-sm font-bold'>{new Intl.NumberFormat().format(contract.valuationAmount ?? 0)}</p>
          </Link>
        ))}
      </div>
      {!contracts.length && <EmptyState text={t('contracts.empty')} />}
    </div>
  )
}
