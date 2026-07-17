import { useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ContractResDtoOutput, ContractStatusProgressResDtoOutput } from '~/api/model/contracts'
import type { EditorActionResult } from '../types'
import { ContractActionMessage, ContractPageLayout, contractInput } from './components/contract-shared'

export function EditorContractRevenuePage({
  contract,
  progress
}: {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
}) {
  const { t } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  return (
    <ContractPageLayout contract={contract} progress={progress} title={t('contractDetail.sections.revenue')}>
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        {contract.contractType === 'REVENUE_SHARE' && contract.status === 'FULLY_EXECUTED' ? (
          <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-3'>
            <input type='hidden' name='intent' value='reportRevenue' />
            <input name='period' required className={contractInput} placeholder='2026-Q2' />
            <input
              name='revenue'
              required
              type='number'
              min={0}
              className={contractInput}
              placeholder={t('contractDetail.revenue')}
            />
            <button className='rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'>
              {t('actions.reportRevenue')}
            </button>
          </fetcher.Form>
        ) : contract.contractType !== 'REVENUE_SHARE' ? (
          <p className='text-sm text-muted-foreground'>{t('contractDetail.revenueShareOnly')}</p>
        ) : (
          <p className='text-sm text-muted-foreground'>{t('contractDetail.revenueExecutedOnly')}</p>
        )}
        <ContractActionMessage data={fetcher.data} />
      </section>
    </ContractPageLayout>
  )
}
