import { useEffect, useRef, useState } from 'react'
import { Link, useFetcher } from 'react-router'
import { FilePlus2, FileSignature, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { EditorActionResult, EditorContractsData } from '../types'
import { Dialog } from '~/shared/ui/dialog'

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary'
const creationBlockingStatuses = new Set([
  'DRAFT',
  'MANGAKA_REVIEW',
  'MANGAKA_APPROVED',
  'BOARD_APPROVED',
  'NEGOTIATION',
  'MANGAKA_SIGNED',
  'FULLY_EXECUTED'
])

export function EditorContractsPage({ data, hasError }: { data: EditorContractsData; hasError: boolean }) {
  const { t, i18n } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const [decisionId, setDecisionId] = useState('')
  const [contractType, setContractType] = useState<'FULL_BUYOUT' | 'REVENUE_SHARE'>('REVENUE_SHARE')
  const [publisherOwnershipPct, setPublisherOwnershipPct] = useState(50)
  const [mangakaOwnershipPct, setMangakaOwnershipPct] = useState(50)
  const [contractStart, setContractStart] = useState('')
  const [contractEnd, setContractEnd] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [contractSearch, setContractSearch] = useState('')
  const [contractStatus, setContractStatus] = useState('')
  const [listContractType, setListContractType] = useState('')
  const submittedRef = useRef(false)
  const eligibleDecisions = data.decisions.filter(
    (decision) =>
      decision.targetSeriesId &&
      data.series.some((series) => series.id === decision.targetSeriesId) &&
      !data.contracts.some(
        (contract) =>
          creationBlockingStatuses.has(contract.status) &&
          (contract.boardDecisionId === decision.id || contract.seriesId === decision.targetSeriesId)
      )
  )
  const selectedDecision = eligibleDecisions.find((decision) => decision.id === decisionId)
  const selectedSeries = data.series.find((item) => item.id === selectedDecision?.targetSeriesId)
  const selectedSession = data.sessions.find((session) => session.id === selectedDecision?.boardSessionId)
  const ownershipValid =
    publisherOwnershipPct + mangakaOwnershipPct === 100 &&
    (contractType !== 'FULL_BUYOUT' || (publisherOwnershipPct === 100 && mangakaOwnershipPct === 0))
  const datesValid = Boolean(contractStart && contractEnd && contractEnd > contractStart)
  const contractStatuses = [...new Set(data.contracts.map((contract) => contract.status))]
  const filteredContracts = data.contracts.filter((contract) => {
    const contractSeries = data.series.find((item) => item.id === contract.seriesId)
    return (!contractSearch || `${contract.series?.title ?? contractSeries?.title ?? ''}`.toLowerCase().includes(contractSearch.toLowerCase())) &&
      (!contractStatus || contract.status === contractStatus) &&
      (!listContractType || contract.contractType === listContractType)
  })

  function selectContractType(value: 'FULL_BUYOUT' | 'REVENUE_SHARE') {
    setContractType(value)
    if (value === 'FULL_BUYOUT') {
      setPublisherOwnershipPct(100)
      setMangakaOwnershipPct(0)
    }
  }

  useEffect(() => {
    if (submittedRef.current && fetcher.state === 'idle' && fetcher.data?.ok) {
      submittedRef.current = false
      setCreateOpen(false)
    }
  }, [fetcher.data, fetcher.state])

  return (
    <div className='space-y-7 pb-12'>
      <header>
        <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <FileSignature className='size-4' />
          {t('contracts.eyebrow')}
        </div>
        <h1 className='mt-2 text-2xl font-bold text-foreground md:text-3xl'>{t('contracts.title')}</h1>
        <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground'>{t('contracts.subtitle')}</p>
      </header>
      {hasError && (
        <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
          {t('errors.loadDescription')}
        </p>
      )}
      <section className='flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm'>
        <div>
          <h2 className='text-lg font-bold text-foreground'>{t('contracts.createTitle')}</h2>
          <p className='mt-1 text-sm text-muted-foreground'>{t('contracts.createDescription')}</p>
        </div>
        <button
          type='button'
          onClick={() => setCreateOpen(true)}
          disabled={!eligibleDecisions.length}
          className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50'
        >
          <FilePlus2 className='size-4' />
          {t('actions.createContract')}
        </button>
        {!eligibleDecisions.length && (
          <p className='w-full text-xs font-semibold text-muted-foreground'>{t('contracts.noEligibleDecisions')}</p>
        )}
      </section>
      {createOpen && (
        <Dialog open onClose={() => setCreateOpen(false)} titleId='editor-create-contract-title' title={t('contracts.createTitle')} description={t('contracts.createDescription')} size='xl'>
        <fetcher.Form
          method='post'
          onSubmit={() => {
            submittedRef.current = true
          }}
          className='grid gap-3 md:grid-cols-2'
        >
          <input type='hidden' name='intent' value='createContract' />
          <input type='hidden' name='seriesId' value={selectedSeries?.id ?? ''} />
          <input type='hidden' name='mangakaId' value={selectedSeries?.mangakaId ?? ''} />
          <label className='grid gap-1.5 text-sm font-semibold md:col-span-2'>
            {t('contracts.selectApprovedDecision')}
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
                    {series?.title ?? decision.targetSeries?.title ?? t('contractDecision.unknownSeries')} · {session?.title ?? t('contractDecision.unknownDecision')}
                  </option>
                )
              })}
            </select>
          </label>
          {selectedDecision && selectedSeries && (
            <aside className='rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm md:col-span-2'>
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
          <label className='grid gap-1.5 text-sm font-semibold'>
            {t('contracts.contractType')}
            <select
              name='contractType'
              value={contractType}
              onChange={(event) => selectContractType(event.target.value as 'FULL_BUYOUT' | 'REVENUE_SHARE')}
              className={inputClass}
            >
              <option value='REVENUE_SHARE'>{t('filters.contractTypes.REVENUE_SHARE')}</option>
              <option value='FULL_BUYOUT'>{t('filters.contractTypes.FULL_BUYOUT')}</option>
            </select>
          </label>
          <label className='grid gap-1.5 text-sm font-semibold'>
            {t('contracts.valuation')}
            <input name='valuationAmount' type='number' min={0} required className={inputClass} />
          </label>
          <label className='grid gap-1.5 text-sm font-semibold'>
            {t('contracts.publisherPct')}
            <input
              name='publisherOwnershipPct'
              type='number'
              min={0}
              max={100}
              required
              readOnly={contractType === 'FULL_BUYOUT'}
              value={publisherOwnershipPct}
              onChange={(event) => setPublisherOwnershipPct(Number(event.target.value))}
              className={inputClass}
            />
          </label>
          <label className='grid gap-1.5 text-sm font-semibold'>
            {t('contracts.mangakaPct')}
            <input
              name='mangakaOwnershipPct'
              type='number'
              min={0}
              max={100}
              required
              readOnly={contractType === 'FULL_BUYOUT'}
              value={mangakaOwnershipPct}
              onChange={(event) => setMangakaOwnershipPct(Number(event.target.value))}
              className={inputClass}
            />
          </label>
          <label className='grid gap-1.5 text-sm font-semibold'>
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
              className={inputClass}
            />
          </label>
          <label className='grid gap-1.5 text-sm font-semibold'>
            {t('contracts.contractEnd')}
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
          <textarea
            name='terminationClause'
            required
            className='min-h-24 rounded-md border border-input bg-background p-3 text-sm text-foreground md:col-span-2'
            placeholder={t('contracts.terminationClause')}
          />
          <button
            disabled={
              fetcher.state !== 'idle' || !selectedDecision || !selectedSeries || !ownershipValid || !datesValid
            }
            className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50 md:col-span-2'
          >
            {fetcher.state !== 'idle' ? <Loader2 className='size-4 animate-spin' /> : <FilePlus2 className='size-4' />}
            {t('actions.createContract')}
          </button>
          {fetcher.data && (
            <p
              className={`text-xs font-semibold md:col-span-2 ${fetcher.data.ok ? 'text-primary' : 'text-destructive'}`}
            >
              {fetcher.data.ok ? t('messages.createContract') : t(`errors.${fetcher.data.errorKey ?? 'actionFailed'}`)}
            </p>
          )}
        </fetcher.Form>
        </Dialog>
      )}
      <section>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-lg font-bold text-foreground'>{t('contracts.listTitle')}</h2>
          <span className='rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground'>
            {filteredContracts.length}
          </span>
        </div>
        <div className='mb-4 grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-3'>
          <input className={inputClass} value={contractSearch} onChange={(event) => setContractSearch(event.target.value)} placeholder={t('filters.searchContracts')} />
          <select className={inputClass} value={contractStatus} onChange={(event) => setContractStatus(event.target.value)}>
            <option value=''>{t('filters.allContractStatuses')}</option>
            {contractStatuses.map((value) => <option key={value} value={value}>{t(`filters.contractStatuses.${value}`, { defaultValue: value })}</option>)}
          </select>
          <select className={inputClass} value={listContractType} onChange={(event) => setListContractType(event.target.value)}>
            <option value=''>{t('filters.allContractTypes')}</option>
            <option value='FULL_BUYOUT'>{t('filters.contractTypes.FULL_BUYOUT')}</option>
            <option value='REVENUE_SHARE'>{t('filters.contractTypes.REVENUE_SHARE')}</option>
          </select>
        </div>
        <div className='grid gap-4 xl:grid-cols-2'>
          {filteredContracts.map((contract) => {
            const series = data.series.find((item) => item.id === contract.seriesId)
            return (
              <Link
                key={contract.id}
                to={`/dashboard/editor/contracts/${contract.id}`}
                className='rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50'
              >
                <div className='flex items-center justify-between gap-3'>
                  <h3 className='font-bold text-foreground'>
                    {contract.series?.title ?? series?.title ?? t('contractDecision.unknownSeries')}
                  </h3>
                  <span className='rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold text-secondary-foreground'>
                    {contract.status.replaceAll('_', ' ')}
                  </span>
                </div>
                <p className='mt-2 text-sm text-muted-foreground'>
                  {contract.contractType} · {formatMoney(contract.valuationAmount)}
                </p>
                <p className='mt-3 text-xs text-muted-foreground'>
                  {contract.publisherOwnershipPct ?? 0}% / {contract.mangakaOwnershipPct ?? 0}%
                </p>
              </Link>
            )
          })}
          {!filteredContracts.length && (
            <div className='rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground'>
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
