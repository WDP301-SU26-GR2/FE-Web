import { ArrowLeft, ExternalLink, WalletCards } from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import type { PaymentRecordResDtoOutput } from '~/api/model/payments'
import { formatPaymentAmount, formatPaymentDate } from './payment-formatters'
import { paymentStatusClass } from './payment-status'

interface MangakaPaymentDetailPageProps {
  payment: PaymentRecordResDtoOutput | null
  loadFailed: boolean
}

export function MangakaPaymentDetailPage({ payment, loadFailed }: MangakaPaymentDetailPageProps) {
  const { t, i18n } = useTranslation('mangaka')
  const language = i18n.resolvedLanguage ?? i18n.language

  if (loadFailed || !payment) {
    return (
      <div className='mx-auto max-w-4xl space-y-5 pb-12'>
        <BackLink label={t('finance.actions.backToRecords')} />
        <p
          role='alert'
          className='rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive'
        >
          {t('finance.errors.detail')}
        </p>
      </div>
    )
  }

  const status = paymentStatusLabel(t, payment.status)
  return (
    <div className='mx-auto max-w-4xl space-y-6 pb-12'>
      <BackLink label={t('finance.actions.backToRecords')} />
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='flex items-center gap-2 text-sm font-semibold text-primary'>
            <WalletCards className='size-5' aria-hidden='true' />
            {t('finance.detail.eyebrow')}
          </p>
          <h1 className='mt-2 text-2xl font-bold tracking-tight text-foreground'>
            {paymentTypeLabel(t, payment.paymentType)}
          </h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            {t('finance.detail.created', {
              date: formatPaymentDate(payment.createdAt, language) ?? t('finance.unknown')
            })}
          </p>
        </div>
        <div className='text-right'>
          <p className='text-2xl font-bold text-foreground'>{formatPaymentAmount(payment.amount, language)}</p>
          <span className={paymentStatusClass}>{status}</span>
        </div>
      </header>

      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <h2 className='font-semibold text-foreground'>{t('finance.detail.origin')}</h2>
        <dl className='mt-4 grid gap-4 sm:grid-cols-2'>
          <Fact label={t('finance.detail.type')} value={paymentTypeLabel(t, payment.paymentType)} />
          <Fact label={t('finance.detail.source')} value={paymentSourceLabel(t, payment.paymentSource)} />
          <Fact label={t('finance.detail.period')} value={payment.period} />
          <Fact label={t('finance.detail.receiver')} value={payment.receiver?.displayName ?? payment.receiverId} />
          <Fact
            label={t('finance.detail.series')}
            value={payment.series?.title}
            link={payment.seriesId ? `/dashboard/mangaka/series/${payment.seriesId}` : undefined}
          />
          <Fact
            label={t('finance.detail.contract')}
            value={payment.contractId}
            link={`/dashboard/mangaka/contracts/${payment.contractId}`}
          />
          <Fact label={t('finance.detail.description')} value={payment.description} />
        </dl>
      </section>

      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <h2 className='font-semibold text-foreground'>{t('finance.detail.processing')}</h2>
        <dl className='mt-4 grid gap-4 sm:grid-cols-2'>
          <Fact label={t('finance.detail.status')} value={status} />
          <Fact label={t('finance.detail.approver')} value={payment.approver?.displayName} />
          <Fact label={t('finance.detail.approvedAt')} value={formatPaymentDate(payment.approvedAt, language)} />
          <Fact label={t('finance.detail.paidAt')} value={formatPaymentDate(payment.paidAt, language)} />
          <Fact label={t('finance.detail.method')} value={payment.paymentMethod} />
          <Fact label={t('finance.detail.reference')} value={payment.transactionReference} />
          <Fact label={t('finance.detail.cancelledAt')} value={formatPaymentDate(payment.cancelledAt, language)} />
          <Fact label={t('finance.detail.cancelReason')} value={payment.cancelReason} />
          <Fact label={t('finance.detail.note')} value={payment.note} />
        </dl>
      </section>
    </div>
  )
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      to='/dashboard/mangaka/payments'
      className='inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline'
    >
      <ArrowLeft className='size-4' aria-hidden='true' />
      {label}
    </Link>
  )
}

function Fact({ label, value, link }: { label: string; value: string | null | undefined; link?: string }) {
  const { t } = useTranslation('mangaka')
  return (
    <div>
      <dt className='text-xs font-medium text-muted-foreground'>{label}</dt>
      <dd className='mt-1 break-words text-sm font-semibold text-foreground'>
        {link && value ? (
          <Link to={link} className='inline-flex items-center gap-1 text-primary hover:underline'>
            {value}
            <ExternalLink className='size-3.5' aria-hidden='true' />
          </Link>
        ) : (
          (value ?? t('finance.notAvailable'))
        )}
      </dd>
    </div>
  )
}

function paymentStatusLabel(t: (key: string, options?: Record<string, unknown>) => string, status: string): string {
  return t(`finance.status.${status}`, { defaultValue: t('finance.unknown') })
}

function paymentTypeLabel(t: (key: string, options?: Record<string, unknown>) => string, type: string): string {
  return t(`finance.type.${type}`, { defaultValue: t('finance.unknown') })
}

function paymentSourceLabel(t: (key: string, options?: Record<string, unknown>) => string, source: string): string {
  return t(`finance.source.${source}`, { defaultValue: t('finance.unknown') })
}
