import { ArrowLeft, FileClock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import type { ContractVersionResDtoOutput } from '~/api/model/contracts'

interface MangakaContractVersionDetailPageProps {
  contractId: string
  version: ContractVersionResDtoOutput | null
  loadFailed: boolean
}

export function MangakaContractVersionDetailPage({
  contractId,
  version,
  loadFailed
}: MangakaContractVersionDetailPageProps) {
  const { t, i18n } = useTranslation('mangaka')
  const language = i18n.resolvedLanguage ?? i18n.language
  const backToHistory = `/dashboard/mangaka/contracts/${contractId}`

  if (loadFailed || !version) {
    return (
      <div className='mx-auto max-w-4xl space-y-5 pb-12'>
        <BackLink to={backToHistory} label={t('contracts.versionDetail.back')} />
        <p
          role='alert'
          className='rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive'
        >
          {t('contracts.versionDetail.loadFailed')}
        </p>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-4xl space-y-6 pb-12'>
      <BackLink to={backToHistory} label={t('contracts.versionDetail.back')} />
      <header>
        <p className='flex items-center gap-2 text-sm font-semibold text-primary'>
          <FileClock className='size-5' aria-hidden='true' />
          {t('contracts.versionDetail.eyebrow')}
        </p>
        <h1 className='mt-2 text-2xl font-bold tracking-tight text-foreground'>
          {t('contracts.versions.version', { number: version.versionNumber })}
        </h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          {t('contracts.versionDetail.createdAtValue', { date: formatDateTime(version.createdAt, language) })}
        </p>
      </header>

      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <h2 className='font-semibold text-foreground'>{t('contracts.versionDetail.terms')}</h2>
        <dl className='mt-4 grid gap-4 sm:grid-cols-2'>
          <Fact label={t('contracts.versionDetail.versionNumber')} value={String(version.versionNumber)} />
          <Fact
            label={t('contracts.versionDetail.valuationAmount')}
            value={formatMoney(version.valuationAmount, language)}
          />
          <Fact
            label={t('contracts.versionDetail.publisherOwnershipPct')}
            value={formatPercent(version.publisherOwnershipPct, language)}
          />
          <Fact
            label={t('contracts.versionDetail.mangakaOwnershipPct')}
            value={formatPercent(version.mangakaOwnershipPct, language)}
          />
          <Fact label={t('contracts.versionDetail.terminationClause')} value={version.terminationClause} fullWidth />
          <Fact label={t('contracts.versionDetail.note')} value={version.note} fullWidth />
        </dl>
      </section>

      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <h2 className='font-semibold text-foreground'>{t('contracts.versionDetail.audit')}</h2>
        <dl className='mt-4 grid gap-4 sm:grid-cols-2'>
          <Fact label={t('contracts.versionDetail.versionId')} value={version.id} />
          <Fact label={t('contracts.versionDetail.contractId')} value={version.contractId} />
          <Fact label={t('contracts.versionDetail.editedById')} value={version.editedById} />
          <Fact label={t('contracts.versionDetail.createdAt')} value={formatDateTime(version.createdAt, language)} />
        </dl>
      </section>
    </div>
  )
}

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className='inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline'>
      <ArrowLeft className='size-4' aria-hidden='true' />
      {label}
    </Link>
  )
}

function Fact({ label, value, fullWidth = false }: { label: string; value: string | null; fullWidth?: boolean }) {
  const { t } = useTranslation('mangaka')
  return (
    <div className={fullWidth ? 'sm:col-span-2' : undefined}>
      <dt className='text-xs font-medium text-muted-foreground'>{label}</dt>
      <dd className='mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-foreground'>
        {value || t('contracts.versionDetail.notAvailable')}
      </dd>
    </div>
  )
}

function formatDateTime(value: string, language: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(language)
}

function formatMoney(value: number | null, language: string): string | null {
  return value == null ? null : new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(value)
}

function formatPercent(value: number | null, language: string): string | null {
  return value == null ? null : `${new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(value)}%`
}
