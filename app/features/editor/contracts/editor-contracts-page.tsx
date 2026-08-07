import { useEffect, useRef, useState } from 'react'
import { Link, useFetcher, useNavigate } from 'react-router'
import { FilePlus2, FileSignature, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { EditorActionResult, EditorContractsData } from '../types'
import { MoneyInWords } from '~/shared/components/money-in-words'
import { Dialog } from '~/shared/ui/dialog'
import { EditorActionToast } from '../components/editor-action-toast'
import { CreateContractBodyDtoContractType } from '~/api/model/contracts'
import { Pagination } from '~/shared/components'
import {
  CONTRACT_FIELD_LIMITS,
  EDITOR_CONTRACT_INTENTS,
  blocksNewContractCreation,
  contractDatesAreValid,
  contractValuationIsValid,
  ownershipIsValid
} from './contract-flow'
import {
  InitialPaymentConditionFields,
  type InitialConditionType,
  type InitialPayoutMode
} from './components/initial-payment-condition-fields'

const EDITOR_LIST_PAGE_SIZE = 8
const inputClass =
  'h-10 min-w-0 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary'
const contractFieldClass = 'grid min-w-0 grid-rows-[2.5rem_auto] gap-1.5 text-xs font-semibold'
const contractFieldWideClass = `${contractFieldClass} md:col-span-2`
const contractFieldLabelClass = 'flex min-h-10 items-end leading-5 text-foreground'
export function EditorContractsPage({ data, hasError }: { data: EditorContractsData; hasError: boolean }) {
  const { t, i18n } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const navigate = useNavigate()
  const [decisionId, setDecisionId] = useState('')
  const [contractType, setContractType] = useState<CreateContractBodyDtoContractType>(
    CreateContractBodyDtoContractType.REVENUE_SHARE
  )
  const [valuationInput, setValuationInput] = useState('')

  const valuationAmount = valuationInput === '' ? null : Number(valuationInput)
  const [publisherOwnershipPct, setPublisherOwnershipPct] = useState(50)
  const [mangakaOwnershipPct, setMangakaOwnershipPct] = useState(50)
  const [contractStart, setContractStart] = useState('')
  const [contractEnd, setContractEnd] = useState('')
  const [conditionType, setConditionType] = useState<InitialConditionType>('CHAPTER_MILESTONE')
  const [payoutMode, setPayoutMode] = useState<InitialPayoutMode>('amount')
  const [createOpen, setCreateOpen] = useState(false)
  const [contractSearch, setContractSearch] = useState('')
  const [contractStatus, setContractStatus] = useState('')
  const [listContractType, setListContractType] = useState('')
  const [page, setPage] = useState(1)
  const submittedRef = useRef(false)
  const eligibleDecisions = data.decisions.filter(
    (decision) =>
      decision.targetSeriesId &&
      data.series.some((series) => series.id === decision.targetSeriesId) &&
      !data.contracts.some(
        (contract) =>
          blocksNewContractCreation(contract) &&
          (contract.boardDecisionId === decision.id || contract.seriesId === decision.targetSeriesId)
      )
  )
  const selectedDecision = eligibleDecisions.find((decision) => decision.id === decisionId)
  const selectedSeries = data.series.find((item) => item.id === selectedDecision?.targetSeriesId)
  const selectedSession = data.sessions.find((session) => session.id === selectedDecision?.boardSessionId)
  const ownershipValid = ownershipIsValid(contractType, publisherOwnershipPct, mangakaOwnershipPct)
  const datesValid = contractDatesAreValid(contractStart, contractEnd)
  const valuationValid = valuationAmount !== null && contractValuationIsValid(valuationAmount)
  const contractStatuses = [...new Set(data.contracts.map((contract) => contract.status))]
  const filteredContracts = data.contracts.filter((contract) => {
    const contractSeries = data.series.find((item) => item.id === contract.seriesId)
    return (
      (!contractSearch ||
        `${contract.series?.title ?? contractSeries?.title ?? ''}`
          .toLowerCase()
          .includes(contractSearch.toLowerCase())) &&
      (!contractStatus || contract.status === contractStatus) &&
      (!listContractType || contract.contractType === listContractType)
    )
  })
  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / EDITOR_LIST_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const from = filteredContracts.length === 0 ? 0 : (currentPage - 1) * EDITOR_LIST_PAGE_SIZE + 1
  const to = Math.min(currentPage * EDITOR_LIST_PAGE_SIZE, filteredContracts.length)
  const paginatedContracts = filteredContracts.slice(from > 0 ? from - 1 : 0, to)

  function selectContractType(value: typeof contractType) {
    setContractType(value)
    if (value === CreateContractBodyDtoContractType.FULL_BUYOUT) {
      setPublisherOwnershipPct(100)
      setMangakaOwnershipPct(0)
    }
  }

  useEffect(() => {
    if (submittedRef.current && fetcher.state === 'idle' && fetcher.data?.ok) {
      submittedRef.current = false
      setCreateOpen(false)
      if (fetcher.data.contractId) void navigate(`/dashboard/editor/contracts/${fetcher.data.contractId}`)
    }
  }, [fetcher.data, fetcher.state, navigate])

  return (
    <div className='space-y-7 pb-12'>
      <header>
        <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <FileSignature className='size-4' />
          {t('contracts.eyebrow')}
        </div>
        <h1 className='mt-2 text-xl font-bold text-foreground md:text-2xl'>{t('contracts.title')}</h1>
        <p className='mt-2 max-w-3xl text-xs leading-6 text-muted-foreground'>{t('contracts.subtitle')}</p>
      </header>
      {hasError && (
        <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive'>
          {t('errors.loadDescription')}
        </p>
      )}
      <EditorActionToast data={fetcher.data} scope='editor-create-contract' />
      <section className='flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm'>
        <div>
          <h2 className='text-base font-bold text-foreground'>{t('contracts.createTitle')}</h2>
          <p className='mt-1 text-xs text-muted-foreground'>{t('contracts.createDescription')}</p>
        </div>
        <button
          type='button'
          onClick={() => setCreateOpen(true)}
          disabled={!eligibleDecisions.length}
          className='inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto'
        >
          <FilePlus2 className='size-4' />
          {t('actions.createContract')}
        </button>
        {!eligibleDecisions.length && (
          <p className='w-full text-xs font-semibold text-muted-foreground'>{t('contracts.noEligibleDecisions')}</p>
        )}
      </section>
      {createOpen && (
        <Dialog
          compact
          open
          onClose={() => setCreateOpen(false)}
          titleId='editor-create-contract-title'
          title={t('contracts.createTitle')}
          description={t('contracts.createDescription')}
          size='xl'
        >
          <fetcher.Form
            method='post'
            onSubmit={() => {
              submittedRef.current = true
            }}
            className='grid gap-3 md:grid-cols-2'
          >
            <input type='hidden' name='intent' value={EDITOR_CONTRACT_INTENTS.create} />
            <input type='hidden' name='seriesId' value={selectedSeries?.id ?? ''} />
            <input type='hidden' name='mangakaId' value={selectedSeries?.mangakaId ?? ''} />
            <label className={contractFieldWideClass}>
              <span className={contractFieldLabelClass}>{t('contracts.selectApprovedDecision')}</span>
              <select
                name='boardDecisionId'
                required
                value={decisionId}
                onChange={(event) => setDecisionId(event.target.value)}
                className={inputClass}
              >
                <option value=''>{t('contracts.selectDecision')}</option>
                {eligibleDecisions.map((decision) => {
                  const series = data.series.find((item) => item.id === decision.targetSeriesId)
                  const session = data.sessions.find((item) => item.id === decision.boardSessionId)
                  return (
                    <option key={decision.id} value={decision.id}>
                      {series?.title ?? decision.targetSeries?.title ?? t('contractDecision.unknownSeries')} ·{' '}
                      {session?.title ?? t('contractDecision.unknownDecision')}
                    </option>
                  )
                })}
              </select>
            </label>
            {selectedDecision && selectedSeries && (
              <aside className='rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs md:col-span-2'>
                <p className='font-bold text-foreground'>
                  {t('contractDecision.serializationSummary', { series: selectedSeries.title })}
                </p>
                <p className='mt-1 text-muted-foreground'>
                  {t('contractDecision.session')}: {selectedSession?.title ?? '—'}
                </p>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {t('contractDecision.decidedAt')}:{' '}
                  {selectedDecision.decidedAt
                    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
                        new Date(selectedDecision.decidedAt)
                      )
                    : t('contractDecision.notFinalized')}
                </p>
              </aside>
            )}
            <label className={contractFieldClass}>
              <span className={contractFieldLabelClass}>{t('contracts.contractType')}</span>
              <select
                name='contractType'
                value={contractType}
                onChange={(event) => selectContractType(event.target.value as typeof contractType)}
                className={inputClass}
              >
                {Object.values(CreateContractBodyDtoContractType).map((value) => (
                  <option key={value} value={value}>
                    {t(`filters.contractTypes.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className={contractFieldClass}>
              <span className={contractFieldLabelClass}>{t('contracts.valuation')}</span>
              <input
                name='valuationAmount'
                type='number'
                min={CONTRACT_FIELD_LIMITS.moneyMinimum}
                max={CONTRACT_FIELD_LIMITS.moneyMaximum}
                step={1}
                required
                value={valuationInput}
                onChange={(event) => {
                  setValuationInput(event.target.value)
                }}
                className={inputClass}
              />
              <MoneyInWords amount={valuationAmount} locale={i18n.language} />
            </label>
            <label className={contractFieldClass}>
              <span className={contractFieldLabelClass}>{t('contracts.publisherPct')}</span>
              <input
                name='publisherOwnershipPct'
                type='number'
                min={contractType === CreateContractBodyDtoContractType.FULL_BUYOUT ? 100 : 1}
                max={contractType === CreateContractBodyDtoContractType.FULL_BUYOUT ? 100 : 99}
                step={1}
                required
                readOnly={contractType === CreateContractBodyDtoContractType.FULL_BUYOUT}
                value={publisherOwnershipPct}
                onChange={(event) => setPublisherOwnershipPct(Number(event.target.value))}
                className={inputClass}
              />
            </label>
            <label className={contractFieldClass}>
              <span className={contractFieldLabelClass}>{t('contracts.mangakaPct')}</span>
              <input
                name='mangakaOwnershipPct'
                type='number'
                min={contractType === CreateContractBodyDtoContractType.FULL_BUYOUT ? 0 : 1}
                max={contractType === CreateContractBodyDtoContractType.FULL_BUYOUT ? 0 : 99}
                step={1}
                required
                readOnly={contractType === CreateContractBodyDtoContractType.FULL_BUYOUT}
                value={mangakaOwnershipPct}
                onChange={(event) => setMangakaOwnershipPct(Number(event.target.value))}
                className={inputClass}
              />
            </label>
            <label className={contractFieldClass}>
              <span className={contractFieldLabelClass}>{t('contracts.contractStart')}</span>
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
                className={inputClass}
              />
            </label>
            <label className={contractFieldClass}>
              <span className={contractFieldLabelClass}>{t('contracts.contractEnd')}</span>
              <input
                name='contractEnd'
                type='datetime-local'
                required
                min={contractStart || undefined}
                value={contractEnd}
                onChange={(event) => setContractEnd(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className={contractFieldWideClass}>
              <span className={contractFieldLabelClass}>{t('contracts.terminationClause')}</span>
              <textarea
                name='terminationClause'
                required
                className='min-h-24 min-w-0 rounded-md border border-input bg-background p-3 text-xs text-foreground'
              />
            </label>
            <InitialPaymentConditionFields
              conditionType={conditionType}
              onConditionTypeChange={setConditionType}
              payoutMode={payoutMode}
              onPayoutModeChange={setPayoutMode}
            />
            <button
              disabled={
                fetcher.state !== 'idle' ||
                !selectedDecision ||
                !selectedSeries ||
                !valuationValid ||
                !ownershipValid ||
                !datesValid
              }
              className='inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50 md:col-span-2'
            >
              {fetcher.state !== 'idle' ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <FilePlus2 className='size-4' />
              )}
              {t('actions.createContract')}
            </button>
          </fetcher.Form>
        </Dialog>
      )}
      <section>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-base font-bold text-foreground'>{t('contracts.listTitle')}</h2>
          <span className='rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground'>
            {filteredContracts.length}
          </span>
        </div>
        <div className='mb-4 grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-3'>
          <input
            className={inputClass}
            value={contractSearch}
            onChange={(event) => {
              setContractSearch(event.target.value)
              setPage(1)
            }}
            placeholder={t('filters.searchContracts')}
          />
          <select
            className={inputClass}
            value={contractStatus}
            onChange={(event) => {
              setContractStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value=''>{t('filters.allContractStatuses')}</option>
            {contractStatuses.map((value) => (
              <option key={value} value={value}>
                {t(`filters.contractStatuses.${value}`, { defaultValue: t('common.notAvailable') })}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={listContractType}
            onChange={(event) => {
              setListContractType(event.target.value)
              setPage(1)
            }}
          >
            <option value=''>{t('filters.allContractTypes')}</option>
            <option value='FULL_BUYOUT'>{t('filters.contractTypes.FULL_BUYOUT')}</option>
            <option value='REVENUE_SHARE'>{t('filters.contractTypes.REVENUE_SHARE')}</option>
          </select>
        </div>
        <div className='grid gap-4 xl:grid-cols-2'>
          {paginatedContracts.map((contract) => {
            const series = data.series.find((item) => item.id === contract.seriesId)
            return (
              <Link
                key={contract.id}
                to={`/dashboard/editor/contracts/${contract.id}`}
                className='rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <h3 className='min-w-0 text-pretty font-bold leading-6 text-foreground'>
                    {contract.series?.title ?? series?.title ?? t('contractDecision.unknownSeries')}
                  </h3>
                  <span className='rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold text-secondary-foreground'>
                    {t(`filters.contractStatuses.${contract.status}`)}
                  </span>
                </div>
                <p className='mt-2 text-xs text-muted-foreground'>
                  {t(`filters.contractTypes.${contract.contractType}`)} · {formatMoney(contract.valuationAmount)}
                </p>
                <MoneyInWords amount={contract.valuationAmount} locale={i18n.language} />
                <p className='mt-3 text-xs text-muted-foreground'>
                  {contract.publisherOwnershipPct ?? 0}% / {contract.mangakaOwnershipPct ?? 0}%
                </p>
              </Link>
            )
          })}
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
          {!filteredContracts.length && (
            <div className='rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground'>
              {t('contracts.empty')}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function formatMoney(value: number | null) {
  return value == null ? '—' : new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)
}
