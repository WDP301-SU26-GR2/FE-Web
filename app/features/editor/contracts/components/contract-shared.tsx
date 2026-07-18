import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ContractResDtoOutput, ContractStatusProgressResDtoOutput } from '~/api/model/contracts'
import type { EditorActionResult } from '../../types'

export const contractInput =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary'

export function ContractPageLayout({
  contract,
  progress,
  title,
  children
}: {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
  title: string
  children: React.ReactNode
}) {
  const { t } = useTranslation('editor')
  return (
    <div className='space-y-7 pb-12'>
      <Link
        to={`/dashboard/editor/contracts/${contract.id}`}
        className='inline-flex items-center gap-2 text-sm font-bold text-primary'
      >
        <ArrowLeft className='size-4' />
        {t('contractDetail.backOverview')}
      </Link>
      <ContractHeader contract={contract} progress={progress} />
      <h2 className='text-2xl font-bold text-foreground'>{title}</h2>
      {children}
    </div>
  )
}

export function ContractHeader({
  contract,
  progress
}: {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
}) {
  const { t } = useTranslation('editor')
  return (
    <header className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='text-xs font-bold uppercase tracking-[0.18em] text-primary'>{t('contractDetail.eyebrow')}</p>
          <h1 className='mt-2 text-2xl font-bold text-foreground'>{contract.id}</h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            {contract.contractType} · {contract.seriesId}
          </p>
        </div>
        <span className='rounded-full bg-secondary px-3 py-1.5 text-xs font-extrabold text-secondary-foreground'>
          {contract.status.replaceAll('_', ' ')}
        </span>
      </div>
      {progress && (
        <div className='mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-3'>
          <Metric
            label={t('contractDetail.mangakaSigned')}
            value={progress.mangaka.isSigned ? t('contractDetail.yes') : t('contractDetail.no')}
          />
          <Metric
            label={t('contractDetail.boardSigned')}
            value={`${progress.boardProgress.totalSigned}/${progress.boardProgress.totalRequired}`}
          />
          <Metric label={t('contractDetail.currentStatus')} value={progress.status} />
        </div>
      )}
    </header>
  )
}

export function ContractActionMessage({ data }: { data?: EditorActionResult }) {
  const { t } = useTranslation('editor')
  if (!data) return null
  return (
    <p className={`mt-3 text-xs font-semibold ${data.ok ? 'text-primary' : 'text-destructive'}`}>
      {data.ok ? t(`messages.${data.messageKey}`) : t('errors.actionFailed')}
    </p>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='mt-1 text-sm font-bold text-foreground'>{value}</p>
    </div>
  )
}
