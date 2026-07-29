import { ArrowLeft, FileSignature, KeyRound, Loader2 } from 'lucide-react'
import { Link, useFetcher } from 'react-router'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  AmendmentResDtoOutput,
  ContractListItemDtoOutput,
  ContractResDtoOutput,
  ContractStatusProgressResDtoOutput,
  ContractVersionResDtoOutput,
  PaymentConditionResDtoOutput
} from '~/api/model/contracts'
import { ContractDecisionBasis, ContractPdfButton, PaymentConditionsSummary } from '~/shared/components/contracts'
import { Dialog } from '~/shared/ui/dialog'
import { hasValidPaymentCondition } from '~/shared/lib/contracts/payment-conditions'
import { ContractVersionHistoryPanel } from './contract-version-history-panel'

export type MangakaContractActionResult = {
  ok: boolean
  intent: string
  message?: string
}

const inputClass =
  'h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary'

export function MangakaContractsPage({ contracts }: { contracts: ContractListItemDtoOutput[] }) {
  const { t, i18n } = useTranslation('mangaka')

  return (
    <div className='space-y-6 pb-12'>
      <header>
        <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <FileSignature className='size-4' />
          {t('contracts.list.eyebrow')}
        </div>
        <h1 className='mt-2 text-2xl font-bold text-foreground md:text-3xl'>{t('contracts.list.title')}</h1>
        <p className='mt-2 text-sm text-muted-foreground'>{t('contracts.list.description')}</p>
      </header>

      <div className='grid gap-4 xl:grid-cols-2'>
        {contracts.map((contract) => (
          <Link
            key={contract.id}
            to={`/dashboard/mangaka/contracts/${contract.id}`}
            className='rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50'
          >
            <div className='flex items-start justify-between gap-3'>
              <div>
                <h2 className='font-bold text-foreground'>
                  {t('contracts.list.contractTitle', {
                    series: contract.series?.title ?? t('contracts.unknownSeries')
                  })}
                </h2>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {t('contracts.list.series', {
                    series: contract.series?.title ?? t('contracts.notAvailable')
                  })}
                </p>
              </div>
              <StatusBadge value={contract.status} />
            </div>
            <div className='mt-4 grid grid-cols-2 gap-3 text-sm'>
              <Metric
                label={t('contracts.fields.type')}
                value={t(`contracts.types.${contract.contractType}`, { defaultValue: contract.contractType })}
              />
              <Metric
                label={t('contracts.fields.value')}
                value={formatMoney(contract.valuationAmount, i18n.language)}
              />
            </div>
          </Link>
        ))}
        {!contracts.length && (
          <div className='rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground xl:col-span-2'>
            {t('contracts.list.empty')}
          </div>
        )}
      </div>
    </div>
  )
}

export function MangakaContractDetailPage({
  contract,
  progress,
  progressLoadFailed = false,
  conditions,
  amendments,
  conditionsLoadFailed = false,
  versions,
  versionsLoadFailed = false
}: {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
  progressLoadFailed?: boolean
  conditions: PaymentConditionResDtoOutput[]
  amendments: AmendmentResDtoOutput[]
  conditionsLoadFailed?: boolean
  versions: ContractVersionResDtoOutput[]
  versionsLoadFailed?: boolean
}) {
  const { t, i18n } = useTranslation('mangaka')
  const fetcher = useFetcher<MangakaContractActionResult>()
  const isWorking = fetcher.state !== 'idle'
  const [requestChangesOpen, setRequestChangesOpen] = useState(false)
  const conditionsReady = !conditionsLoadFailed && hasValidPaymentCondition(conditions)

  return (
    <div className='flex flex-col gap-6 pb-12'>
      <header>
        <Link
          to='/dashboard/mangaka/contracts'
          className='inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='size-4' /> {t('contracts.detail.back')}
        </Link>
        <div className='mt-4 flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-bold text-foreground'>
              {t('contracts.list.contractTitle', {
                series: contract.series?.title ?? t('contracts.unknownSeries')
              })}
            </h1>
            <p className='mt-1 text-sm text-muted-foreground'>
              {t('contracts.list.series', {
                series: contract.series?.title ?? t('contracts.notAvailable')
              })}
            </p>
          </div>
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <ContractPdfButton
              contract={contract}
              conditionsCount={
                conditions.filter(
                  (condition) =>
                    condition.status !== 'DISABLED' &&
                    ((condition.payoutAmount ?? 0) > 0 || (condition.payoutPct ?? 0) > 0)
                ).length
              }
            />
            <StatusBadge value={contract.status} />
          </div>
        </div>
      </header>

      <ContractDecisionBasis contract={contract} />

      <Panel title={t('contracts.detail.sections.terms')}>
        <div className='grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4'>
          <Metric
            label={t('contracts.fields.type')}
            value={t(`contracts.types.${contract.contractType}`, { defaultValue: contract.contractType })}
          />
          <Metric label={t('contracts.fields.value')} value={formatMoney(contract.valuationAmount, i18n.language)} />
          <Metric label={t('contracts.fields.publisherOwnership')} value={`${contract.publisherOwnershipPct ?? 0}%`} />
          <Metric label={t('contracts.fields.mangakaOwnership')} value={`${contract.mangakaOwnershipPct ?? 0}%`} />
          <Metric label={t('contracts.fields.start')} value={formatDate(contract.contractStart, i18n.language)} />
          <Metric label={t('contracts.fields.end')} value={formatDate(contract.contractEnd, i18n.language)} />
        </div>
        <div className='mt-5 rounded-lg bg-muted/50 p-4'>
          <p className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>
            {t('contracts.fields.terminationClause')}
          </p>
          <p className='mt-2 whitespace-pre-wrap text-sm text-foreground'>
            {contract.terminationClause || t('contracts.notAvailable')}
          </p>
        </div>
      </Panel>

      <Panel title={t('contracts.detail.sections.actions')} className='order-4'>
        {!conditionsReady && (
          <p className='mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive'>
            {t('contracts.detail.paymentConditionsRequired')}
          </p>
        )}
        {progress && (
          <div className='mb-5 grid gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-2'>
            <Metric
              label={t('contracts.detail.mangakaSignature')}
              value={t(progress.mangaka.isSigned ? 'contracts.detail.signed' : 'contracts.detail.notSigned')}
            />
            <Metric
              label={t('contracts.detail.boardSignatureProgress')}
              value={`${progress.boardProgress.totalSigned}/${progress.boardProgress.totalRequired}`}
            />
          </div>
        )}
        {progressLoadFailed && (
          <p className='mb-5 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning'>
            {t('contracts.detail.progressLoadFailed')}
          </p>
        )}
        {contract.status === 'MANGAKA_REVIEW' && (
          <div className='flex flex-wrap gap-3'>
            <fetcher.Form method='post'>
              <button
                name='intent'
                value='approve'
                disabled={isWorking || !conditionsReady}
                className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
              >
                {t('contracts.actions.approveTerms')}
              </button>
            </fetcher.Form>
            <button
              type='button'
              disabled={isWorking}
              onClick={() => setRequestChangesOpen(true)}
              className='h-10 rounded-md border border-border px-4 text-sm font-bold text-foreground disabled:opacity-50'
            >
              {t('contracts.actions.requestChanges')}
            </button>
          </div>
        )}
        <div className={contract.status === 'MANGAKA_REVIEW' ? 'mt-5 border-t border-border pt-5' : ''}>
          <h3 className='text-sm font-bold text-foreground'>{t('contracts.detail.mangakaSignature')}</h3>
          <p className='mt-1 text-xs text-muted-foreground'>
            {contract.status === 'BOARD_APPROVED'
              ? t('contracts.detail.signatureReady')
              : contract.mangakaSignedAt
                ? t('contracts.detail.signedAt', {
                    date: new Date(contract.mangakaSignedAt).toLocaleString(i18n.language)
                  })
                : t('contracts.detail.signatureLocked')}
          </p>
          <fetcher.Form method='post' className='mt-3 flex flex-wrap items-center gap-3'>
            <button
              type='submit'
              name='intent'
              value='sendOtp'
              disabled={isWorking || contract.status !== 'BOARD_APPROVED' || !conditionsReady}
              formNoValidate
              className='inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-bold disabled:opacity-50'
            >
              <KeyRound className='size-4' /> {t('contracts.actions.sendOtp')}
            </button>
            <input
              name='otpCode'
              inputMode='numeric'
              pattern='[0-9]{6}'
              minLength={6}
              maxLength={6}
              placeholder={t('contracts.fields.otpPlaceholder')}
              required
              disabled={contract.status !== 'BOARD_APPROVED' || !conditionsReady}
              className={`${inputClass} w-40`}
            />
            <button
              name='intent'
              value='signContract'
              disabled={isWorking || contract.status !== 'BOARD_APPROVED' || !conditionsReady}
              className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
            >
              {t('contracts.actions.signContract')}
            </button>
          </fetcher.Form>
        </div>
        {contract.status !== 'MANGAKA_REVIEW' && contract.status !== 'BOARD_APPROVED' && !contract.mangakaSignedAt && (
          <p className='text-sm text-muted-foreground'>
            {t(`contracts.detail.statusHints.${contract.status}`, {
              defaultValue: t('contracts.detail.statusHints.default')
            })}
          </p>
        )}
        <ActionFeedback fetcher={fetcher} />
      </Panel>

      <Panel title={t('contracts.detail.sections.paymentConditions')} className='order-3'>
        <PaymentConditionsSummary conditions={conditions} loadFailed={conditionsLoadFailed} />
      </Panel>

      <ContractVersionHistoryPanel
        contractId={contract.id}
        versions={versions}
        loadFailed={versionsLoadFailed}
        className='order-5'
      />

      <Panel title={t('contracts.detail.sections.amendments')} className='order-6'>
        <div className='space-y-3'>
          {amendments.map((amendment) => (
            <MangakaAmendmentRow key={amendment.id} contract={contract} amendment={amendment} />
          ))}
          {!amendments.length && (
            <p className='text-sm text-muted-foreground'>{t('contracts.detail.amendmentsEmpty')}</p>
          )}
        </div>
      </Panel>

      <Dialog
        open={requestChangesOpen && contract.status === 'MANGAKA_REVIEW'}
        onClose={() => {
          if (!isWorking) setRequestChangesOpen(false)
        }}
        titleId='request-contract-changes-title'
        descriptionId='request-contract-changes-description'
        title={t('contracts.requestChanges.title')}
        description={t('contracts.requestChanges.description')}
        size='md'
        footer={
          <div className='flex justify-end gap-2'>
            <button
              type='button'
              disabled={isWorking}
              onClick={() => setRequestChangesOpen(false)}
              className='h-10 rounded-md border border-border px-4 text-sm font-bold text-foreground disabled:opacity-50'
            >
              {t('contracts.actions.cancel')}
            </button>
            <button
              type='submit'
              form='request-contract-changes-form'
              disabled={isWorking}
              className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
            >
              {isWorking && <Loader2 className='size-4 animate-spin' />}
              {t('contracts.actions.submitRequest')}
            </button>
          </div>
        }
      >
        <fetcher.Form id='request-contract-changes-form' method='post' className='space-y-2'>
          <input type='hidden' name='intent' value='requestChanges' />
          <label htmlFor='contract-change-reason' className='block text-sm font-semibold text-foreground'>
            {t('contracts.requestChanges.reason')} <span className='text-destructive'>*</span>
          </label>
          <textarea
            id='contract-change-reason'
            name='reason'
            required
            minLength={1}
            maxLength={1000}
            rows={6}
            autoFocus
            placeholder={t('contracts.requestChanges.placeholder')}
            className='w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'
          />
          <p className='text-xs text-muted-foreground'>{t('contracts.requestChanges.hint')}</p>
          {fetcher.state === 'idle' && fetcher.data?.intent === 'requestChanges' && !fetcher.data.ok && (
            <p className='text-xs font-semibold text-destructive'>{fetcher.data.message}</p>
          )}
        </fetcher.Form>
      </Dialog>
    </div>
  )
}

function MangakaAmendmentRow({
  contract,
  amendment
}: {
  contract: ContractResDtoOutput
  amendment: AmendmentResDtoOutput
}) {
  const { t } = useTranslation('mangaka')
  const fetcher = useFetcher<MangakaContractActionResult>()
  const canRespond = contract.contractType === 'REVENUE_SHARE' && amendment.status === 'PENDING_SIGNATURES'
  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <strong className='text-sm'>{amendment.reason || t('contracts.detail.amendmentFallback')}</strong>
          <p className='mt-1 text-xs text-muted-foreground'>{amendment.changedClauses.join(', ')}</p>
        </div>
        <StatusBadge value={amendment.status} />
      </div>
      {canRespond && (
        <div className='mt-4 grid gap-3 lg:grid-cols-2'>
          <fetcher.Form method='post' className='flex flex-wrap items-center gap-2'>
            <input type='hidden' name='amendmentId' value={amendment.id} />
            <button
              name='intent'
              value='sendOtp'
              formNoValidate
              className='h-10 rounded-md border border-border px-3 text-sm font-bold'
            >
              {t('contracts.actions.sendOtpShort')}
            </button>
            <input
              name='otpCode'
              inputMode='numeric'
              pattern='[0-9]{6}'
              minLength={6}
              maxLength={6}
              required
              placeholder={t('contracts.fields.otpPlaceholder')}
              className={`${inputClass} w-36`}
            />
            <button
              name='intent'
              value='signAmendment'
              className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
            >
              {t('contracts.actions.signAmendment')}
            </button>
          </fetcher.Form>
          <fetcher.Form method='post' className='flex flex-wrap items-center gap-2'>
            <input type='hidden' name='amendmentId' value={amendment.id} />
            <input
              name='reason'
              required
              placeholder={t('contracts.amendment.rejectReason')}
              className={`${inputClass} min-w-52 flex-1`}
            />
            <button
              name='intent'
              value='rejectAmendment'
              className='h-10 rounded-md border border-destructive/40 px-3 text-sm font-bold text-destructive'
            >
              {t('contracts.actions.reject')}
            </button>
          </fetcher.Form>
        </div>
      )}
      <ActionFeedback fetcher={fetcher} />
    </article>
  )
}

function ActionFeedback({ fetcher }: { fetcher: { state: string; data?: MangakaContractActionResult } }) {
  const { t } = useTranslation('mangaka')

  if (fetcher.state !== 'idle')
    return (
      <p className='mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground'>
        <Loader2 className='size-3 animate-spin' /> {t('contracts.feedback.processing')}
      </p>
    )
  if (!fetcher.data) return null
  return (
    <p className={`mt-3 text-xs font-semibold ${fetcher.data.ok ? 'text-primary' : 'text-destructive'}`}>
      {fetcher.data.ok
        ? fetcher.data.intent === 'sendOtp'
          ? t('contracts.feedback.otpSent')
          : t('contracts.feedback.updated')
        : fetcher.data.message}
    </p>
  )
}

function Panel({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}>
      <h2 className='mb-4 text-lg font-bold text-foreground'>{title}</h2>
      {children}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='text-xs font-semibold text-muted-foreground'>{label}</p>
      <p className='mt-1 font-bold text-foreground'>{value}</p>
    </div>
  )
}

function StatusBadge({ value }: { value: string }) {
  const { t } = useTranslation('mangaka')

  return (
    <span className='inline-flex rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold text-secondary-foreground'>
      {t(`contracts.statuses.${value}`, { defaultValue: value.replaceAll('_', ' ') })}
    </span>
  )
}

function formatMoney(value: number | null, locale: string) {
  return new Intl.NumberFormat(locale).format(value ?? 0)
}

function formatDate(value: string | null, locale: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale)
}
