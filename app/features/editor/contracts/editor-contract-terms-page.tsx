import { useFetcher } from 'react-router'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ContractResDtoOutput, ContractStatusProgressResDtoOutput } from '~/api/model/contracts'
import type { EditorActionResult } from '../types'
import { ContractActionMessage, ContractPageLayout, contractInput } from './components/contract-shared'

export function EditorContractTermsPage({
  contract,
  progress
}: {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
}) {
  const { t } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const editable = contract.status === 'DRAFT'
  return (
    <ContractPageLayout contract={contract} progress={progress} title={t('contractDetail.terms')}>
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <fetcher.Form method='post' className='grid gap-3 md:grid-cols-2'>
          <input type='hidden' name='intent' value='updateContract' />
          <select
            name='contractType'
            defaultValue={contract.contractType}
            disabled={!editable}
            className={contractInput}
          >
            <option value='REVENUE_SHARE'>REVENUE_SHARE</option>
            <option value='FULL_BUYOUT'>FULL_BUYOUT</option>
          </select>
          <input
            name='valuationAmount'
            type='number'
            min={0}
            defaultValue={contract.valuationAmount ?? 0}
            disabled={!editable}
            className={contractInput}
          />
          <input
            name='publisherOwnershipPct'
            type='number'
            min={0}
            max={100}
            defaultValue={contract.publisherOwnershipPct ?? 0}
            disabled={!editable}
            className={contractInput}
          />
          <input
            name='mangakaOwnershipPct'
            type='number'
            min={0}
            max={100}
            defaultValue={contract.mangakaOwnershipPct ?? 0}
            disabled={!editable}
            className={contractInput}
          />
          <input
            name='contractStart'
            type='datetime-local'
            defaultValue={toLocal(contract.contractStart)}
            disabled={!editable}
            className={contractInput}
          />
          <input
            name='contractEnd'
            type='datetime-local'
            defaultValue={toLocal(contract.contractEnd)}
            disabled={!editable}
            className={contractInput}
          />
          <textarea
            name='terminationClause'
            defaultValue={contract.terminationClause ?? ''}
            disabled={!editable}
            className='min-h-28 rounded-md border border-input bg-background p-3 text-sm text-foreground disabled:opacity-70 md:col-span-2'
          />
          {editable && (
            <button
              disabled={fetcher.state !== 'idle'}
              className='h-10 rounded-md border border-border px-4 text-sm font-bold md:col-span-2'
            >
              {t('actions.saveContract')}
            </button>
          )}
        </fetcher.Form>
        {!['FULLY_EXECUTED', 'FULFILLED', 'TERMINATED', 'TERMINATED_BY_BREACH', 'EXPIRED', 'VOIDED'].includes(
          contract.status
        ) && (
          <fetcher.Form method='post' className='mt-3'>
            <input type='hidden' name='intent' value='advanceContract' />
            <button
              disabled={fetcher.state !== 'idle'}
              className='inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'
            >
              {fetcher.state !== 'idle' && <Loader2 className='size-4 animate-spin' />}
              {t('actions.advanceContract')}
            </button>
          </fetcher.Form>
        )}
        <ContractActionMessage data={fetcher.data} />
      </section>
    </ContractPageLayout>
  )
}

function toLocal(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : ''
}
