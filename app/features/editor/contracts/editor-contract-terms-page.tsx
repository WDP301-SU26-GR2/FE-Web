import { useState } from 'react'
import { useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ContractResDtoOutput } from '~/api/model/contracts'
import type { EditorActionResult } from '../types'
import { MoneyInWords } from '~/shared/components/money-in-words'
import {
  CONTRACT_FIELD_LIMITS,
  EDITOR_CONTRACT_INTENTS,
  canEditContract,
  contractDatesAreValid,
  contractValuationIsValid,
  ownershipIsValid
} from './contract-flow'
import { ContractActionMessage, contractDialogButton, contractInput } from './components/contract-shared'

const contractTermFieldClass = 'grid min-w-0 grid-rows-[2.5rem_auto] gap-1.5 text-xs font-semibold'
const contractTermWideFieldClass = `${contractTermFieldClass} md:col-span-2`
const contractTermFieldLabelClass = 'flex min-h-10 items-end leading-5 text-foreground'

export function ContractTermsForm({ contract, action }: { contract: ContractResDtoOutput; action: string }) {
  const { t, i18n } = useTranslation('editor')
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
          <label className={contractTermFieldClass}>
            <span className={contractTermFieldLabelClass}>{t('contracts.contractType')}</span>
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
          <label className={contractTermFieldClass}>
            <span className={contractTermFieldLabelClass}>{t('contracts.valuation')}</span>
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
            <MoneyInWords amount={valuationAmount} locale={i18n.language} />
          </label>
          <label className={contractTermFieldClass}>
            <span className={contractTermFieldLabelClass}>{t('contracts.publisherPct')}</span>
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
          <label className={contractTermFieldClass}>
            <span className={contractTermFieldLabelClass}>{t('contracts.mangakaPct')}</span>
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
          <label className={contractTermFieldClass}>
            <span className={contractTermFieldLabelClass}>{t('contracts.contractStart')}</span>
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
          <label className={contractTermFieldClass}>
            <span className={contractTermFieldLabelClass}>{t('contracts.contractEnd')}</span>
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
          <label className={contractTermWideFieldClass}>
            <span className={contractTermFieldLabelClass}>{t('contracts.terminationClause')}</span>
            <textarea
              name='terminationClause'
              defaultValue={contract.terminationClause ?? ''}
              disabled={!editable}
              required
              className='min-h-28 min-w-0 rounded-md border border-input bg-background p-3 text-xs text-foreground disabled:opacity-70'
            />
          </label>
          <label className={contractTermWideFieldClass}>
            <span className={contractTermFieldLabelClass}>{t('contractDetail.editNote')}</span>
            <textarea
              name='note'
              maxLength={CONTRACT_FIELD_LIMITS.versionNoteMaxLength}
              disabled={!editable}
              className='min-h-20 min-w-0 rounded-md border border-input bg-background p-3 text-xs text-foreground disabled:opacity-70'
            />
          </label>
          {editable && (
            <div className='flex justify-end md:col-span-2'>
              <button
                name='intent'
                value={EDITOR_CONTRACT_INTENTS.update}
                disabled={fetcher.state !== 'idle' || !valuationValid || !ownershipValid || !datesValid}
                className={`${contractDialogButton} bg-primary text-primary-foreground disabled:opacity-50`}
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
