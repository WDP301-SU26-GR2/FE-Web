import { useEffect, useState } from 'react'
import { Link, useFetcher, useNavigate } from 'react-router'
import {
  ArrowLeft,
  ChevronRight,
  FileClock,
  FilePenLine,
  Landmark,
  Milestone,
  MessageSquareText,
  RotateCcw,
  ScrollText,
  WalletCards
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { EditorContractDetailData } from '../types'
import type { EditorActionResult } from '../types'
import { ContractHeader } from './components/contract-shared'
import { ContractActionMessage } from './components/contract-shared'
import { EDITOR_CONTRACT_INTENTS, canRedraftContract } from './contract-flow'
import { ContractTermsForm } from './editor-contract-terms-page'
import { ContractConditionsManager } from './editor-contract-conditions-page'
import { ContractDecisionBasis, ContractPdfButton, PaymentConditionsSummary } from '~/shared/components/contracts'
import { Dialog } from '~/shared/ui/dialog'

export function EditorContractDetailPage({ data }: { data: EditorContractDetailData }) {
  const { t, i18n } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const navigate = useNavigate()
  const [openDetail, setOpenDetail] = useState<'terms' | 'conditions' | null>(null)
  const basePath = `/dashboard/editor/contracts/${data.contract.id}`
  const validConditionCount = data.conditions.filter(
    (condition) =>
      condition.status !== 'DISABLED' && ((condition.payoutAmount ?? 0) > 0 || (condition.payoutPct ?? 0) > 0)
  ).length
  const sections = [
    ['history', FileClock],
    ['payments', WalletCards],
    ['revenue', Landmark],
    ['amendments', ScrollText]
  ] as const

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok && fetcher.data.contractId) {
      void navigate(`/dashboard/editor/contracts/${fetcher.data.contractId}`)
    }
  }, [fetcher.data, fetcher.state, navigate])
  return (
    <div className='space-y-7 pb-12'>
      <Link to='/dashboard/editor/contracts' className='inline-flex items-center gap-2 text-xs font-bold text-primary'>
        <ArrowLeft className='size-4' />
        {t('actions.backContracts')}
      </Link>
      <ContractHeader contract={data.contract} progress={data.progress} />
      <div className='flex justify-end'>
        <ContractPdfButton contract={data.contract} />
      </div>
      <ContractDecisionBasis contract={data.contract} decisionPath='/dashboard/editor/board/decisions' />
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h2 className='flex items-center gap-2 font-bold text-foreground'>
              <FilePenLine className='size-5 text-primary' />
              {t('contractDetail.sections.terms')}
            </h2>
            <p className='mt-1 text-xs text-muted-foreground'>{t('contractDetail.sectionDescriptions.terms')}</p>
          </div>
          <button
            type='button'
            onClick={() => setOpenDetail('terms')}
            className='inline-flex items-center gap-1 text-xs font-bold text-primary'
          >
            {t('contractDetail.editTerms')}
            <ChevronRight className='size-4' />
          </button>
        </div>
        <dl className='mt-5 grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3'>
          {[
            [t('contracts.contractType'), t(`filters.contractTypes.${data.contract.contractType}`)],
            [t('contracts.valuation'), formatMoney(data.contract.valuationAmount, i18n.language)],
            [t('contracts.publisherPct'), formatPercent(data.contract.publisherOwnershipPct, i18n.language)],
            [t('contracts.mangakaPct'), formatPercent(data.contract.mangakaOwnershipPct, i18n.language)],
            [t('contracts.contractStart'), formatDate(data.contract.contractStart, i18n.language)],
            [t('contracts.contractEnd'), formatDate(data.contract.contractEnd, i18n.language)]
          ].map(([label, value]) => (
            <div key={label}>
              <dt className='text-muted-foreground'>{label}</dt>
              <dd className='mt-1 font-semibold text-foreground'>{value}</dd>
            </div>
          ))}
        </dl>
        <div className='mt-5 border-t border-border pt-4'>
          <p className='text-xs text-muted-foreground'>{t('contracts.terminationClause')}</p>
          <p className='mt-1 whitespace-pre-wrap text-xs font-semibold leading-5 text-foreground'>
            {data.contract.terminationClause || t('common.notAvailable')}
          </p>
        </div>
      </section>
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <div className='mb-5 flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h2 className='flex items-center gap-2 font-bold text-foreground'>
              <Milestone className='size-5 text-primary' />
              {t('contractDetail.sections.conditions')}
            </h2>
            <p className='mt-1 text-xs text-muted-foreground'>
              {validConditionCount
                ? t('contractDetail.paymentConditionReady', { count: validConditionCount })
                : t('contractDetail.paymentConditionMissing')}
            </p>
          </div>
          <button
            type='button'
            onClick={() => setOpenDetail('conditions')}
            className='inline-flex items-center gap-1 text-xs font-bold text-primary'
          >
            {t('contractDetail.manageConditions')}
            <ChevronRight className='size-4' />
          </button>
        </div>
        <PaymentConditionsSummary conditions={data.conditions} />
      </section>
      {data.contract.supersedesContractId && (
        <section className='rounded-xl border border-border bg-muted/40 p-4 text-xs text-foreground'>
          {t('contractDetail.supersedesContract')}{' '}
          <Link
            className='font-bold text-primary underline'
            to={`/dashboard/editor/contracts/${data.contract.supersedesContractId}`}
          >
            {t('contractDetail.openSupersededContract')}
          </Link>
        </section>
      )}
      {data.contract.rejectionReason && (
        <section className='rounded-xl border border-destructive/30 bg-destructive/10 p-5'>
          <h2 className='font-bold text-destructive'>{t('contractDetail.rejectionTitle')}</h2>
          <p className='mt-2 whitespace-pre-wrap text-xs text-foreground'>{data.contract.rejectionReason}</p>
          {data.contract.mangakaRejectedAt && (
            <p className='mt-2 text-xs text-muted-foreground'>
              {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
                new Date(data.contract.mangakaRejectedAt)
              )}
            </p>
          )}
        </section>
      )}
      {canRedraftContract(data.contract) && (
        <fetcher.Form method='post' className='flex justify-end'>
          <button
            name='intent'
            value={EDITOR_CONTRACT_INTENTS.redraft}
            disabled={fetcher.state !== 'idle'}
            className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'
          >
            <RotateCcw className='size-4' />
            {t('actions.redraftContract')}
          </button>
        </fetcher.Form>
      )}
      <ContractActionMessage data={fetcher.data} />
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <h2 className='flex items-center gap-2 font-bold text-foreground'>
          <MessageSquareText className='size-5 text-primary' />
          {t('contractDetail.boardComments')}
        </h2>
        <p className='mt-1 text-xs text-muted-foreground'>{t('contractDetail.boardCommentsDescription')}</p>
        <div className='mt-4 grid gap-3'>
          {data.comments.map((comment) => (
            <article key={comment.id} className='rounded-lg border border-border bg-muted/40 p-3'>
              <div className='flex flex-wrap justify-between gap-2 text-xs'>
                <strong className='text-foreground'>
                  {comment.author?.displayName ?? t('contractDetail.boardMember')}
                </strong>
                <span className='text-muted-foreground'>
                  {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
                    new Date(comment.createdAt)
                  )}
                </span>
              </div>
              <p className='mt-2 whitespace-pre-wrap text-xs text-foreground'>{comment.content}</p>
            </article>
          ))}
          {!data.comments.length && (
            <p className='text-xs text-muted-foreground'>{t('contractDetail.emptyBoardComments')}</p>
          )}
        </div>
      </section>
      <div className='grid gap-4 md:grid-cols-2'>
        {sections.map(([key, Icon]) => (
          <Link
            key={key}
            to={`${basePath}/${key}`}
            className='group rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary'
          >
            <Icon className='size-6 text-primary' />
            <h2 className='mt-4 font-bold text-foreground'>{t(`contractDetail.sections.${key}`)}</h2>
            <p className='mt-2 min-h-10 text-xs text-muted-foreground'>
              {t(`contractDetail.sectionDescriptions.${key}`)}
            </p>
            <span className='mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary'>
              {t('contractDetail.openSection')}
              <ChevronRight className='size-4 transition-transform group-hover:translate-x-1' />
            </span>
          </Link>
        ))}
      </div>
      <Dialog
        compact
        open={openDetail === 'terms'}
        onClose={() => setOpenDetail(null)}
        titleId='editor-contract-terms-detail-title'
        title={t('contractDetail.sections.terms')}
        description={t('contractDetail.sectionDescriptions.terms')}
        size='xl'
      >
        <ContractTermsForm contract={data.contract} action={basePath} />
      </Dialog>
      <Dialog
        compact
        open={openDetail === 'conditions'}
        onClose={() => setOpenDetail(null)}
        titleId='editor-contract-conditions-detail-title'
        title={t('contractDetail.sections.conditions')}
        description={t('contractDetail.sectionDescriptions.conditions')}
        size='xl'
      >
        <ContractConditionsManager contract={data.contract} conditions={data.conditions} action={basePath} />
      </Dialog>
    </div>
  )
}

function formatMoney(value: number | null, locale: string) {
  return value == null ? '—' : new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
}

function formatPercent(value: number | null, locale: string) {
  return value == null ? '—' : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)}%`
}

function formatDate(value: string | null, locale: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
