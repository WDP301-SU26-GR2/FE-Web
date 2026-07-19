import { Link } from 'react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ContractResDtoOutput } from '~/api/model/contracts'
import { boardInput, BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'

export function BoardContractsPage({ contracts, hasError }: { contracts: ContractResDtoOutput[]; hasError: boolean }) {
  const { t } = useTranslation('board')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [contractType, setContractType] = useState('')
  const statuses = [...new Set(contracts.map((contract) => contract.status))]
  const filteredContracts = contracts.filter((contract) =>
    (!search || `${contract.series?.title ?? ''} ${contract.seriesId}`.toLowerCase().includes(search.toLowerCase())) &&
    (!status || contract.status === status) &&
    (!contractType || contract.contractType === contractType)
  )
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('contracts.title')} description={t('contracts.description')} />
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-3'>
        <input className={boardInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('filters.searchContracts')} />
        <select className={boardInput} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value=''>{t('filters.allContractStatuses')}</option>
          {statuses.map((value) => <option key={value} value={value}>{t(`filters.contractStatuses.${value}`, { defaultValue: value })}</option>)}
        </select>
        <select className={boardInput} value={contractType} onChange={(event) => setContractType(event.target.value)}>
          <option value=''>{t('filters.allContractTypes')}</option>
          {['FULL_BUYOUT', 'REVENUE_SHARE'].map((value) => <option key={value} value={value}>{t(`filters.contractTypes.${value}`)}</option>)}
        </select>
      </div>
      <div className='grid gap-4 md:grid-cols-2'>
        {filteredContracts.map((contract) => (
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
              {t('contracts.series')}: {contract.series?.title ?? contract.seriesId}
            </p>
            <p className='mt-3 text-sm font-bold'>{new Intl.NumberFormat().format(contract.valuationAmount ?? 0)}</p>
          </Link>
        ))}
      </div>
      {!filteredContracts.length && <EmptyState text={t('contracts.empty')} />}
    </div>
  )
}
