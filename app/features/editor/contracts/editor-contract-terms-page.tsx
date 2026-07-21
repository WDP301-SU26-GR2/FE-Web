import { useState } from 'react'
import { Link, useFetcher } from 'react-router'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type {
  ContractResDtoOutput,
  ContractStatusProgressResDtoOutput,
  PaymentConditionListResDtoOutputDataItem
} from '~/api/model/contracts'
import type { EditorActionResult } from '../types'
import { ContractActionMessage, ContractPageLayout, contractInput } from './components/contract-shared'

export function EditorContractTermsPage({
  contract,
  progress,
  conditions
}: {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
  conditions: PaymentConditionListResDtoOutputDataItem[]
}) {
  const { t } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const editable = contract.status === 'NEGOTIATION'
  const canSendDraft = contract.status === 'DRAFT'
  const validConditionCount = conditions.filter(
    (condition) =>
      condition.status !== 'DISABLED' && ((condition.payoutAmount ?? 0) > 0 || (condition.payoutPct ?? 0) > 0)
  ).length
  const hasValidCondition = validConditionCount > 0
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
      <section
        className={`rounded-xl border p-4 text-sm ${
          hasValidCondition
            ? 'border-primary/25 bg-primary/5 text-foreground'
            : 'border-destructive/30 bg-destructive/10 text-destructive'
        }`}
      >
        <p className='font-bold'>
          {hasValidCondition
            ? t('contractDetail.paymentConditionReady', { count: validConditionCount })
            : t('contractDetail.paymentConditionMissing')}
        </p>
        <Link
          to={`/dashboard/editor/contracts/${contract.id}/conditions`}
          className='mt-2 inline-flex font-bold text-primary underline'
        >
          {t('contractDetail.openPaymentConditions')}
        </Link>
      </section>
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <fetcher.Form method='post' className='grid gap-3 md:grid-cols-2'>
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
          {canSendDraft && (
            <div className='md:col-span-2'>
              <p className='mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground'>
                {t('contractDetail.sendDraftHint')}
              </p>
              <button
                name='intent'
                value='advanceContract'
                disabled={fetcher.state !== 'idle' || !hasValidCondition}
                className='inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
              >
                {fetcher.state !== 'idle' && <Loader2 className='size-4 animate-spin' />}
                Gửi Mangaka xem xét
              </button>
            </div>
          )}
          {editable && (
            <div className='grid gap-3 md:col-span-2 sm:grid-cols-2'>
              <button
                name='intent'
                value='updateContract'
                disabled={fetcher.state !== 'idle' || !ownershipValid || !datesValid}
                className='h-10 rounded-md border border-border px-4 text-sm font-bold disabled:opacity-50'
              >
                {t('actions.saveContract')}
              </button>
              <button
                name='intent'
                value='saveAndAdvanceContract'
                disabled={fetcher.state !== 'idle' || !ownershipValid || !datesValid || !hasValidCondition}
                className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
              >
                {fetcher.state !== 'idle' && <Loader2 className='size-4 animate-spin' />}
                {t('actions.saveAndAdvanceContract')}
              </button>
            </div>
          )}
        </fetcher.Form>
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
