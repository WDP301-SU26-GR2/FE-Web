import { Link } from 'react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ContractListItemDtoOutputContractType, type ContractListItemDtoOutput } from '~/api/model/contracts'
import { MoneyInWords } from '~/shared/components/money-in-words'
import { Pagination } from '~/shared/components'
import { boardInput, BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'

const BOARD_LIST_PAGE_SIZE = 8

export function BoardContractsPage({
  contracts,
  hasError
}: {
  contracts: ContractListItemDtoOutput[]
  hasError: boolean
}) {
  const { t, i18n } = useTranslation('board')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [contractType, setContractType] = useState('')
  const [page, setPage] = useState(1)
  const statuses = [...new Set(contracts.map((contract) => contract.status))]
  const filteredContracts = contracts.filter(
    (contract) =>
      (!search ||
        `${contract.series?.title ?? ''} ${contract.seriesId}`.toLowerCase().includes(search.toLowerCase())) &&
      (!status || contract.status === status) &&
      (!contractType || contract.contractType === contractType)
  )
  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / BOARD_LIST_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const from = filteredContracts.length === 0 ? 0 : (currentPage - 1) * BOARD_LIST_PAGE_SIZE + 1
  const to = Math.min(currentPage * BOARD_LIST_PAGE_SIZE, filteredContracts.length)
  const paginatedContracts = filteredContracts.slice(from > 0 ? from - 1 : 0, to)
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('contracts.title')} description={t('contracts.description')} backHref='/dashboard/board' />
      {hasError && <p className='text-xs text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-3'>
        <input
          className={boardInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('filters.searchContracts')}
        />
        <select className={boardInput} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value=''>{t('filters.allContractStatuses')}</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {t(`filters.contractStatuses.${value}`, { defaultValue: t('common.notAvailable') })}
            </option>
          ))}
        </select>
        <select className={boardInput} value={contractType} onChange={(event) => setContractType(event.target.value)}>
          <option value=''>{t('filters.allContractTypes')}</option>
          {Object.values(ContractListItemDtoOutputContractType).map((value) => (
            <option key={value} value={value}>
              {t(`filters.contractTypes.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div className='grid gap-4 md:grid-cols-2'>
        {paginatedContracts.map((contract) => (
          <Link
            key={contract.id}
            to={`/dashboard/board/contracts/${contract.id}`}
            className='rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary'
          >
            <div className='flex flex-wrap justify-between gap-3'>
              <strong className='min-w-0 text-pretty'>{contract.series?.title ?? t('contracts.unknownSeries')}</strong>
              <StatusBadge value={contract.status} />
            </div>
            <p className='mt-2 text-xs text-muted-foreground'>
              {t(`filters.contractTypes.${contract.contractType}`, { defaultValue: t('common.notAvailable') })}
            </p>
            <p className='mt-3 text-xs font-bold'>
              {new Intl.NumberFormat(i18n.language).format(contract.valuationAmount ?? 0)}
            </p>
            <MoneyInWords amount={contract.valuationAmount} locale={i18n.language} />
          </Link>
        ))}
      </div>
      {filteredContracts.length > 0 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          setPage={setPage}
          from={from}
          to={to}
          total={filteredContracts.length}
          tKeyPrefix='pagination'
          t={t}
        />
      )}
      {!filteredContracts.length && <EmptyState text={t('contracts.empty')} />}
    </div>
  )
}
