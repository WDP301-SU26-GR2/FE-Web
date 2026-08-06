import { useState } from 'react'
import { useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ContractResDtoOutput } from '~/api/model/contracts'
import type { EditorActionResult } from '../types'
import {
  CONTRACT_FIELD_LIMITS,
  EDITOR_CONTRACT_INTENTS,
  canEditContract,
  contractDatesAreValid,
  contractValuationIsValid,
  ownershipIsValid
} from './contract-flow'
import { ContractActionMessage, contractInput } from './components/contract-shared'

export function ContractTermsForm({ contract, action }: { contract: ContractResDtoOutput; action: string }) {
  const { t } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const editable = canEditContract(contract)
  const [contractType, setContractType] = useState(contract.contractType)
  const [valuationAmount, setValuationAmount] = useState(contract.valuationAmount ?? 0)
  const [publisherOwnershipPct, setPublisherOwnershipPct] = useState(contract.publisherOwnershipPct ?? 0)
  const [mangakaOwnershipPct, setMangakaOwnershipPct] = useState(contract.mangakaOwnershipPct ?? 0)
  const [contractStart, setContractStart] = useState(toLocal(contract.contractStart))
  const [contractEnd, setContractEnd] = useState(toLocal(contract.contractEnd))
  const ownershipValid = ownershipIsValid(contractType, publisherOwnershipPct, mangakaOwnershipPct)
  const datesValid = contractDatesAreValid(contractStart, contractEnd)
  const valuationValid = contractValuationIsValid(valuationAmount)

  function selectContractType(value: typeof contractType) {
    setContractType(value)
    if (value === 'FULL_BUYOUT') {
      setPublisherOwnershipPct(100)
      setMangakaOwnershipPct(0)
    }
  }
  return (
    <div className='space-y-4'>
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <fetcher.Form method='post' action={action} className='grid gap-3 md:grid-cols-2'>
          <label className='grid gap-1.5 text-xs font-semibold'>
            {t('contracts.contractType')}
            <select
              name='contractType'
              value={contractType}
              onChange={(event) => selectContractType(event.target.value as typeof contractType)}
              required
              disabled={!editable}
              className={contractInput}
            >
              <option value='REVENUE_SHARE'>{t('filters.contractTypes.REVENUE_SHARE')}</option>
              <option value='FULL_BUYOUT'>{t('filters.contractTypes.FULL_BUYOUT')}</option>
            </select>
          </label>
          <label className='grid gap-1.5 text-xs font-semibold'>
            {t('contracts.valuation')}
            <input
              name='valuationAmount'
              type='number'
              min={CONTRACT_FIELD_LIMITS.moneyMinimum}
              max={CONTRACT_FIELD_LIMITS.moneyMaximum}
              step={1}
              value={valuationAmount}
              onChange={(event) => setValuationAmount(Number(event.target.value))}
              disabled={!editable}
              required
              className={contractInput}
            />
          </label>
          <label className='grid gap-1.5 text-xs font-semibold'>
            {t('contracts.publisherPct')}
            <input
              name='publisherOwnershipPct'
              type='number'
              min={contractType === 'FULL_BUYOUT' ? 100 : 1}
              max={contractType === 'FULL_BUYOUT' ? 100 : 99}
              step={1}
              required
              readOnly={contractType === 'FULL_BUYOUT'}
              value={publisherOwnershipPct}
              onChange={(event) => setPublisherOwnershipPct(Number(event.target.value))}
              disabled={!editable}
              className={contractInput}
            />
          </label>
          <label className='grid gap-1.5 text-xs font-semibold'>
            {t('contracts.mangakaPct')}
            <input
              name='mangakaOwnershipPct'
              type='number'
              min={contractType === 'FULL_BUYOUT' ? 0 : 1}
              max={contractType === 'FULL_BUYOUT' ? 0 : 99}
              step={1}
              required
              readOnly={contractType === 'FULL_BUYOUT'}
              value={mangakaOwnershipPct}
              onChange={(event) => setMangakaOwnershipPct(Number(event.target.value))}
              disabled={!editable}
              className={contractInput}
            />
          </label>
          <label className='grid gap-1.5 text-xs font-semibold'>
            {t('contracts.contractStart')}
            <input
              name='contractStart'
              type='datetime-local'
              required
              value={contractStart}
              onChange={(event) => {
                const value = event.target.value
                setContractStart(value)
                if (contractEnd && contractEnd <= value) setContractEnd('')
              }}
              disabled={!editable}
              className={contractInput}
            />
          </label>
          <label className='grid gap-1.5 text-xs font-semibold'>
            {t('contracts.contractEnd')}
            <input
              name='contractEnd'
              type='datetime-local'
              required
              min={contractStart || undefined}
              value={contractEnd}
              onChange={(event) => setContractEnd(event.target.value)}
              disabled={!editable}
              className={contractInput}
            />
          </label>
          <label className='grid gap-1.5 text-xs font-semibold md:col-span-2'>
            {t('contracts.terminationClause')}
            <textarea
              name='terminationClause'
              defaultValue={contract.terminationClause ?? ''}
              disabled={!editable}
              required
              className='min-h-28 rounded-md border border-input bg-background p-3 text-xs text-foreground disabled:opacity-70'
            />
          </label>
          <label className='grid gap-1.5 text-xs font-semibold md:col-span-2'>
            {t('contractDetail.editNote')}
            <textarea
              name='note'
              maxLength={CONTRACT_FIELD_LIMITS.versionNoteMaxLength}
              disabled={!editable}
              className='min-h-20 rounded-md border border-input bg-background p-3 text-xs text-foreground disabled:opacity-70'
            />
          </label>
          {editable && (
            <div className='flex justify-end md:col-span-2'>
              <button
                name='intent'
                value={EDITOR_CONTRACT_INTENTS.update}
                disabled={fetcher.state !== 'idle' || !valuationValid || !ownershipValid || !datesValid}
                className='h-10 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'
              >
                {t('actions.saveContract')}
              </button>
            </div>
          )}
        </fetcher.Form>
        <ContractActionMessage data={fetcher.data} />
      </section>
    </div>
  )
}

function toLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
