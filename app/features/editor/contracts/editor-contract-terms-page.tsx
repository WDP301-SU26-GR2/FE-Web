import { useState } from 'react'
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
  const editable = contract.status === 'DRAFT' || contract.status === 'NEGOTIATION'
  const canAdvance = editable
  const [contractType, setContractType] = useState(contract.contractType)
  const [publisherOwnershipPct, setPublisherOwnershipPct] = useState(contract.publisherOwnershipPct ?? 0)
  const [mangakaOwnershipPct, setMangakaOwnershipPct] = useState(contract.mangakaOwnershipPct ?? 0)
  const [contractStart, setContractStart] = useState(toLocal(contract.contractStart))
  const [contractEnd, setContractEnd] = useState(toLocal(contract.contractEnd))
  const ownershipValid =
    publisherOwnershipPct + mangakaOwnershipPct === 100 &&
    (contractType !== 'FULL_BUYOUT' || (publisherOwnershipPct === 100 && mangakaOwnershipPct === 0))
  const datesValid = Boolean(contractStart && contractEnd && contractEnd > contractStart)

  function selectContractType(value: typeof contractType) {
    setContractType(value)
    if (value === 'FULL_BUYOUT') {
      setPublisherOwnershipPct(100)
      setMangakaOwnershipPct(0)
    }
  }
  return (
    <ContractPageLayout contract={contract} progress={progress} title={t('contractDetail.terms')}>
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <fetcher.Form method='post' className='grid gap-3 md:grid-cols-2'>
          <input type='hidden' name='intent' value='updateContract' />
          <select
            name='contractType'
            value={contractType}
            onChange={(event) => selectContractType(event.target.value as typeof contractType)}
            required
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
            required
            className={contractInput}
          />
          <input
            name='publisherOwnershipPct'
            type='number'
            min={0}
            max={100}
            required
            readOnly={contractType === 'FULL_BUYOUT'}
            value={publisherOwnershipPct}
            onChange={(event) => setPublisherOwnershipPct(Number(event.target.value))}
            disabled={!editable}
            className={contractInput}
          />
          <input
            name='mangakaOwnershipPct'
            type='number'
            min={0}
            max={100}
            required
            readOnly={contractType === 'FULL_BUYOUT'}
            value={mangakaOwnershipPct}
            onChange={(event) => setMangakaOwnershipPct(Number(event.target.value))}
            disabled={!editable}
            className={contractInput}
          />
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
          <textarea
            name='terminationClause'
            defaultValue={contract.terminationClause ?? ''}
            disabled={!editable}
            required
            className='min-h-28 rounded-md border border-input bg-background p-3 text-sm text-foreground disabled:opacity-70 md:col-span-2'
          />
          <textarea
            name='note'
            maxLength={500}
            disabled={!editable}
            className='min-h-20 rounded-md border border-input bg-background p-3 text-sm text-foreground disabled:opacity-70 md:col-span-2'
            placeholder={t('contractDetail.editNote')}
          />
          {editable && (
            <button
              disabled={fetcher.state !== 'idle' || !ownershipValid || !datesValid}
              className='h-10 rounded-md border border-border px-4 text-sm font-bold md:col-span-2'
            >
              {t('actions.saveContract')}
            </button>
          )}
        </fetcher.Form>
        {canAdvance && (
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
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
