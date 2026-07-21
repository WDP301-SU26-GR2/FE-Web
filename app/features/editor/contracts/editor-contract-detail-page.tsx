import { Link } from 'react-router'
import {
  ArrowLeft,
  ChevronRight,
  FileClock,
  FilePenLine,
  Landmark,
  Milestone,
  ScrollText,
  WalletCards
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { EditorContractDetailData } from '../types'
import { ContractHeader } from './components/contract-shared'
import { ContractDecisionBasis } from '~/features/contracts/components/contract-decision-basis'
import { ContractPdfButton } from '~/features/contracts/components/contract-pdf-button'

export function EditorContractDetailPage({ data }: { data: EditorContractDetailData }) {
  const { t } = useTranslation('editor')
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
  return (
    <div className='space-y-7 pb-12'>
      <Link to='/dashboard/editor/contracts' className='inline-flex items-center gap-2 text-sm font-bold text-primary'>
        <ArrowLeft className='size-4' />
        {t('actions.backContracts')}
      </Link>
      <ContractHeader contract={data.contract} progress={data.progress} />
      <div className='flex justify-end'>
        <ContractPdfButton contract={data.contract} conditionsCount={validConditionCount} />
      </div>
      <ContractDecisionBasis contract={data.contract} decisionPath='/dashboard/editor/board/decisions' />
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
                  validConditionCount
                    ? 'bg-primary/10 text-primary'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {validConditionCount
                  ? t('contractDetail.validConditionCount', { count: validConditionCount })
                  : t('contractDetail.noValidConditions')}
              </span>
            )}
            <p className='mt-2 min-h-10 text-sm text-muted-foreground'>
              {t(`contractDetail.sectionDescriptions.${key}`)}
            </p>
            <span className='mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary'>
              {t('contractDetail.openSection')}
              <ChevronRight className='size-4 transition-transform group-hover:translate-x-1' />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
