import { useEffect } from 'react'
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
import { ContractDecisionBasis, ContractPdfButton } from '~/shared/components/contracts'

export function EditorContractDetailPage({ data }: { data: EditorContractDetailData }) {
  const { t, i18n } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const navigate = useNavigate()
  const basePath = `/dashboard/editor/contracts/${data.contract.id}`
  const validConditionCount = data.conditions.filter(
    (condition) =>
      condition.status !== 'DISABLED' && ((condition.payoutAmount ?? 0) > 0 || (condition.payoutPct ?? 0) > 0)
  ).length
  const sections = [
    ['terms', FilePenLine],
    ['conditions', Milestone],
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
        <ContractPdfButton contract={data.contract} conditionsCount={validConditionCount} />
      </div>
      <ContractDecisionBasis contract={data.contract} decisionPath='/dashboard/editor/board/decisions' />
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
            {key === 'conditions' && (
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                  validConditionCount ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                }`}
              >
                {validConditionCount
                  ? t('contractDetail.validConditionCount', { count: validConditionCount })
                  : t('contractDetail.noValidConditions')}
              </span>
            )}
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
    </div>
  )
}
