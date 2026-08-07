import { Link, useFetcher, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  PayPaymentBodyDtoPaymentMethod,
  PaymentRecordResDtoOutputPaymentSource,
  PaymentRecordResDtoOutputPaymentType,
  PaymentRecordResDtoOutputStatus,
  type PaymentRecordResDtoOutput
} from '~/api/model/payments'
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CalendarClock,
  Check,
  Circle,
  Eye,
  FileText,
  ReceiptText,
  ShieldCheck,
  UserRound,
  XCircle,
  type LucideIcon
} from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Dialog } from '~/shared/ui/dialog'
import { MoneyInWords } from '~/shared/components/money-in-words'
import { Pagination } from '~/shared/components'
import {
  BoardActionDialog,
  boardDialogButton,
  boardInput,
  BoardFeedback,
  BoardHeader,
  EmptyState,
  StatusBadge
} from '../components/board-ui'
import type { BoardActionResult } from '../types'

const BOARD_LIST_PAGE_SIZE = 8

export function BoardPaymentsPage({
  payments,
  hasError,
  canApprove = true,
  focusPaymentId = '',
  backPath,
  enableFilters = false,
  contractBasePath,
  seriesBasePath
}: {
  payments: PaymentRecordResDtoOutput[]
  hasError: boolean
  canApprove?: boolean
  focusPaymentId?: string
  backPath?: string
  enableFilters?: boolean
  contractBasePath?: string
  seriesBasePath?: string
}) {
  const { t } = useTranslation('board')
  const [searchParams, setSearchParams] = useSearchParams()
  const paymentStatus = searchParams.get('status') ?? ''
  const paymentType = searchParams.get('paymentType') ?? ''
  const paymentSource = searchParams.get('paymentSource') ?? ''
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const filteredPayments = payments.filter(
    (payment) =>
      (!paymentStatus || payment.status === paymentStatus) &&
      (!paymentType || payment.paymentType === paymentType) &&
      (!paymentSource || payment.paymentSource === paymentSource) &&
      (!search ||
        `${payment.series?.title ?? ''} ${payment.receiver?.displayName ?? ''} ${payment.receiverId}`
          .toLowerCase()
          .includes(search.toLowerCase()))
  )
  const orderedPayments = focusPaymentId
    ? [...filteredPayments].sort(
        (left, right) => Number(right.id === focusPaymentId) - Number(left.id === focusPaymentId)
      )
    : filteredPayments
  const totalPages = Math.max(1, Math.ceil(orderedPayments.length / BOARD_LIST_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const from = orderedPayments.length === 0 ? 0 : (currentPage - 1) * BOARD_LIST_PAGE_SIZE + 1
  const to = Math.min(currentPage * BOARD_LIST_PAGE_SIZE, orderedPayments.length)
  const paginatedPayments = orderedPayments.slice(from > 0 ? from - 1 : 0, to)
  return (
    <div className='space-y-6 pb-12'>
      {backPath && (
        <Link to={backPath} className='inline-flex items-center gap-2 text-xs font-bold text-primary'>
          <ArrowLeft className='size-4' />
          {t('common.back')}
        </Link>
      )}
      <BoardHeader
        title={t(canApprove ? 'payments.title' : 'payments.adminTitle')}
        description={t(canApprove ? 'payments.description' : 'payments.adminDescription')}
      />
      <div className='flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4'>
        <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
          <ShieldCheck className='size-4' aria-hidden='true' />
        </div>
        <div>
          <p className='text-xs font-bold text-foreground'>
            {t(canApprove ? 'payments.boardPermissionTitle' : 'payments.adminPermissionTitle')}
          </p>
          <p className='mt-1 text-xs leading-5 text-muted-foreground'>
            {t(canApprove ? 'payments.boardPermissionHint' : 'payments.adminPermissionHint')}
          </p>
        </div>
      </div>
      {hasError && <p className='text-xs text-destructive'>{t('common.loadError')}</p>}
      {enableFilters && (
        <div className='grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-4'>
          <input
            className={boardInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('filters.searchPayments')}
          />
          <select
            className={boardInput}
            value={paymentStatus}
            onChange={(event) => updateFilter('status', event.target.value)}
          >
            <option value=''>{t('filters.allStatuses')}</option>
            {Object.values(PaymentRecordResDtoOutputStatus).map((value) => (
              <option key={value} value={value}>
                {t(`filters.paymentStatuses.${value}`, { defaultValue: t('common.notAvailable') })}
              </option>
            ))}
          </select>
          <select
            className={boardInput}
            value={paymentType}
            onChange={(event) => updateFilter('paymentType', event.target.value)}
          >
            <option value=''>{t('filters.allPaymentTypes')}</option>
            {Object.values(PaymentRecordResDtoOutputPaymentType).map((value) => (
              <option key={value} value={value}>
                {t(`filters.paymentTypes.${value}`, { defaultValue: t('common.notAvailable') })}
              </option>
            ))}
          </select>
          <select
            className={boardInput}
            value={paymentSource}
            onChange={(event) => updateFilter('paymentSource', event.target.value)}
          >
            <option value=''>{t('filters.allPaymentSources')}</option>
            {Object.values(PaymentRecordResDtoOutputPaymentSource).map((value) => (
              <option key={value} value={value}>
                {t(`filters.paymentSources.${value}`)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className='grid gap-4'>
        {paginatedPayments.map((payment) => (
          <PaymentCard
            key={payment.id}
            payment={payment}
            canApprove={canApprove}
            focused={payment.id === focusPaymentId}
            contractBasePath={contractBasePath}
            seriesBasePath={seriesBasePath}
          />
        ))}
      </div>
      {orderedPayments.length > 0 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          setPage={setPage}
          from={from}
          to={to}
          total={orderedPayments.length}
          tKeyPrefix='pagination'
          t={t}
        />
      )}
      {!orderedPayments.length && <EmptyState text={t('payments.empty')} />}
    </div>
  )

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }
}

function PaymentCard({
  payment,
  canApprove,
  focused,
  contractBasePath,
  seriesBasePath
}: {
  payment: PaymentRecordResDtoOutput
  canApprove: boolean
  focused: boolean
  contractBasePath?: string
  seriesBasePath?: string
}) {
  const { t, i18n } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  return (
    <article
      id={`payment-${payment.id}`}
      className={`rounded-xl border bg-card p-5 shadow-sm ${focused ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
    >
      <div className='flex flex-wrap justify-between gap-3'>
        <div>
          <strong>
            {payment.series?.title ??
              t(`filters.paymentTypes.${payment.paymentType}`, { defaultValue: t('common.notAvailable') })}
          </strong>
          <p className='mt-1 text-xs text-muted-foreground'>
            {t(`filters.paymentTypes.${payment.paymentType}`, { defaultValue: t('common.notAvailable') })} ·{' '}
            {payment.receiver?.displayName ?? t('payments.unknownReceiver')}
          </p>
          {payment.description ? <p className='mt-1 text-xs text-muted-foreground'>{payment.description}</p> : null}
        </div>
        <div className='text-right'>
          <StatusBadge value={payment.status} />
          <p className='mt-2 font-bold'>{new Intl.NumberFormat(i18n.language).format(payment.amount)}</p>
          <MoneyInWords amount={payment.amount} locale={i18n.language} className='max-w-56 text-right' />
        </div>
      </div>
      <div className='mt-4 flex flex-wrap gap-2'>
        <PaymentDetailsDialog payment={payment} contractBasePath={contractBasePath} seriesBasePath={seriesBasePath} />
        {canApprove && payment.status === 'TRIGGERED' && (
          <BoardActionDialog title={t('payments.approve')}>
            <fetcher.Form method='post' className='grid gap-4'>
              <input type='hidden' name='paymentId' value={payment.id} />
              <div className='rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-warning-foreground'>
                <p>
                  {t('payments.approveConfirmation', {
                    amount: new Intl.NumberFormat(i18n.language).format(payment.amount),
                    receiver: payment.receiver?.displayName ?? t('payments.unknownReceiver')
                  })}
                </p>
                <MoneyInWords amount={payment.amount} locale={i18n.language} className='mt-2 text-warning-foreground' />
              </div>
              <button
                name='intent'
                value='approve'
                disabled={fetcher.state !== 'idle'}
                className={`${boardDialogButton} bg-success text-success-foreground disabled:opacity-50`}
              >
                <BadgeCheck className='mr-1.5 inline size-4' aria-hidden='true' />
                {t('payments.approve')}
              </button>
            </fetcher.Form>
            <BoardFeedback data={fetcher.data} />
          </BoardActionDialog>
        )}
        {payment.status === 'APPROVED' && (
          <BoardActionDialog title={t('payments.pay')}>
            <fetcher.Form method='post' className='grid gap-3'>
              <input type='hidden' name='paymentId' value={payment.id} />
              <select className={boardInput} name='paymentMethod' defaultValue='' required>
                <option value='' disabled>
                  {t('payments.method')}
                </option>
                {Object.values(PayPaymentBodyDtoPaymentMethod).map((value) => (
                  <option key={value} value={value}>
                    {t(`payments.methods.${value}`)}
                  </option>
                ))}
              </select>
              <input
                className={boardInput}
                name='transactionReference'
                placeholder={t('payments.reference')}
                required
              />
              <textarea className={`${boardInput} h-20 py-2`} name='note' placeholder={t('payments.noteOptional')} />
              <button
                name='intent'
                value='pay'
                className={`${boardDialogButton} bg-primary text-primary-foreground transition-opacity hover:opacity-90`}
              >
                <Banknote className='mr-1.5 inline size-4' aria-hidden='true' />
                {t('payments.pay')}
              </button>
            </fetcher.Form>
            <BoardFeedback data={fetcher.data} />
          </BoardActionDialog>
        )}{' '}
        {['TRIGGERED', 'APPROVED'].includes(payment.status) && (
          <BoardActionDialog title={t('payments.cancel')}>
            <fetcher.Form method='post' className='grid gap-3'>
              <input type='hidden' name='paymentId' value={payment.id} />
              <input className={boardInput} name='cancelReason' placeholder={t('payments.cancelReason')} required />
              <button
                name='intent'
                value='cancel'
                className={`${boardDialogButton} border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20`}
              >
                <XCircle className='mr-1.5 inline size-4' aria-hidden='true' />
                {t('payments.cancel')}
              </button>
            </fetcher.Form>
            <BoardFeedback data={fetcher.data} />
          </BoardActionDialog>
        )}
      </div>
      <BoardFeedback data={fetcher.data} />
    </article>
  )
}

function PaymentDetailsDialog({
  payment,
  contractBasePath,
  seriesBasePath
}: {
  payment: PaymentRecordResDtoOutput
  contractBasePath?: string
  seriesBasePath?: string
}) {
  const { t, i18n } = useTranslation('board')
  const [open, setOpen] = useState(false)
  const titleId = `payment-detail-${useId().replaceAll(':', '')}`
  const descriptionId = `${titleId}-description`
  const amount = new Intl.NumberFormat(i18n.language).format(payment.amount)
  const hasEvidence = Boolean(
    payment.paymentMethod ||
    payment.transactionReference ||
    payment.paidAt ||
    payment.cancelledAt ||
    payment.cancelReason ||
    payment.note
  )

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className={`${boardDialogButton} gap-2 border border-border bg-card text-foreground transition-colors hover:border-primary/40 hover:text-primary`}
      >
        <Eye className='size-4' />
        {t('payments.details')}
      </button>

      {open && (
        <Dialog
          compact
          open
          onClose={() => setOpen(false)}
          titleId={titleId}
          title={t('payments.details')}
          descriptionId={descriptionId}
          description={t('payments.detailSubtitle')}
          size='xl'
          className='max-w-3xl'
        >
          <div className='space-y-5'>
            <section className='relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-5'>
              <div className='absolute -right-12 -top-16 size-40 rounded-full bg-primary/10 blur-3xl' />
              <div className='relative flex flex-col justify-between gap-5 sm:flex-row sm:items-start'>
                <div className='flex min-w-0 items-start gap-4'>
                  <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
                    <Banknote className='size-5' />
                  </div>
                  <div className='min-w-0'>
                    <p className='text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary'>
                      {t('payments.paymentSummary')}
                    </p>
                    <p className='mt-1 text-2xl font-black tabular-nums text-foreground'>{amount}</p>
                    <MoneyInWords amount={payment.amount} locale={i18n.language} />
                    <p className='mt-1 truncate text-xs font-bold text-foreground'>
                      {payment.series?.title ?? t('payments.unknownSeries')}
                    </p>
                    <p className='mt-1 text-[11px] text-muted-foreground'>
                      {t(`filters.paymentTypes.${payment.paymentType}`, {
                        defaultValue: t('common.notAvailable')
                      })}
                    </p>
                  </div>
                </div>
                <div className='flex shrink-0 flex-col items-start gap-2 sm:items-end'>
                  <StatusBadge value={payment.status} />
                  <code className='text-[10px] text-muted-foreground' title={payment.id}>
                    {t('payments.paymentCode', { code: shortId(payment.id) })}
                  </code>
                </div>
              </div>
              {payment.description && (
                <p className='relative mt-4 border-t border-primary/15 pt-4 text-xs leading-5 text-muted-foreground'>
                  {payment.description}
                </p>
              )}
            </section>

            <div className='grid gap-4 lg:grid-cols-2'>
              <PaymentDetailSection icon={ReceiptText} title={t('payments.originDetails')}>
                <dl className='grid gap-3 sm:grid-cols-2'>
                  <PaymentFact
                    label={t('payments.series')}
                    value={
                      payment.seriesId && seriesBasePath ? (
                        <Link
                          className='font-bold text-primary hover:underline'
                          to={`${seriesBasePath}/${payment.seriesId}`}
                        >
                          {payment.series?.title ?? t('payments.openSeries')}
                        </Link>
                      ) : (
                        payment.series?.title
                      )
                    }
                  />
                  <PaymentFact
                    label={t('payments.contract')}
                    value={
                      contractBasePath ? (
                        <Link
                          className='font-bold text-primary hover:underline'
                          to={`${contractBasePath}/${payment.contractId}`}
                        >
                          {t('payments.openContract')}
                        </Link>
                      ) : (
                        t('payments.contractReference', { code: shortId(payment.contractId) })
                      )
                    }
                  />
                  <PaymentFact
                    label={t('payments.source')}
                    value={t(`filters.paymentSources.${payment.paymentSource}`, {
                      defaultValue: t('common.notAvailable')
                    })}
                  />
                  <PaymentFact label={t('payments.period')} value={payment.period} />
                  <PaymentFact label={t('payments.createdAt')} value={formatDate(payment.createdAt, i18n.language)} />
                </dl>
              </PaymentDetailSection>

              <PaymentDetailSection icon={UserRound} title={t('payments.recipientDetails')}>
                <div className='rounded-xl border border-border bg-background/70 p-4'>
                  <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                    {t('payments.receiver')}
                  </p>
                  <p className='mt-2 text-base font-bold text-foreground'>
                    {payment.receiver?.displayName ?? t('payments.unknownReceiver')}
                  </p>
                  <p className='mt-1 text-[11px] text-muted-foreground'>
                    {t('payments.receiverCode', { code: shortId(payment.receiverId) })}
                  </p>
                </div>
                {payment.approver?.displayName && (
                  <div className='mt-3 flex items-center gap-3 rounded-xl border border-border p-3'>
                    <BadgeCheck className='size-4 shrink-0 text-primary' />
                    <div>
                      <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                        {t('payments.approver')}
                      </p>
                      <p className='mt-0.5 text-xs font-bold text-foreground'>{payment.approver.displayName}</p>
                    </div>
                  </div>
                )}
              </PaymentDetailSection>
            </div>

            <PaymentDetailSection icon={CalendarClock} title={t('payments.processingTimeline')}>
              <div className='grid gap-3 md:grid-cols-3'>
                <PaymentTimelineStep
                  label={t('payments.triggeredStep')}
                  detail={formatDate(payment.createdAt, i18n.language)}
                  state='complete'
                />
                <PaymentTimelineStep
                  label={t('payments.approvedStep')}
                  detail={
                    formatDate(payment.approvedAt, i18n.language) ||
                    (payment.status === 'TRIGGERED' ? t('payments.awaitingApprovalShort') : undefined)
                  }
                  state={payment.approvedAt ? 'complete' : payment.status === 'TRIGGERED' ? 'current' : 'pending'}
                />
                <PaymentTimelineStep
                  label={
                    payment.status === 'CANCELLED'
                      ? t('payments.cancelledStep')
                      : payment.status === 'FAILED'
                        ? t('payments.failedStep')
                        : payment.status === 'MISSED'
                          ? t('payments.missedStep')
                          : t('payments.paidStep')
                  }
                  detail={
                    formatDate(payment.paidAt || payment.cancelledAt, i18n.language) ||
                    (payment.status === 'APPROVED' ? t('payments.awaitingPaymentShort') : undefined)
                  }
                  state={
                    payment.paidAt
                      ? 'complete'
                      : ['CANCELLED', 'FAILED', 'MISSED'].includes(payment.status)
                        ? 'stopped'
                        : payment.status === 'APPROVED'
                          ? 'current'
                          : 'pending'
                  }
                />
              </div>
            </PaymentDetailSection>

            {hasEvidence && (
              <PaymentDetailSection icon={FileText} title={t('payments.paymentEvidence')}>
                <dl className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                  {payment.paymentMethod && <PaymentFact label={t('payments.method')} value={payment.paymentMethod} />}
                  {payment.transactionReference && (
                    <PaymentFact label={t('payments.reference')} value={payment.transactionReference} />
                  )}
                  {payment.paidAt && (
                    <PaymentFact label={t('payments.paidAt')} value={formatDate(payment.paidAt, i18n.language)} />
                  )}
                  {payment.cancelledAt && (
                    <PaymentFact
                      label={t('payments.cancelledAt')}
                      value={formatDate(payment.cancelledAt, i18n.language)}
                    />
                  )}
                  {payment.cancelReason && (
                    <PaymentFact label={t('payments.cancelReason')} value={payment.cancelReason} />
                  )}
                  {payment.note && <PaymentFact label={t('payments.note')} value={payment.note} />}
                </dl>
              </PaymentDetailSection>
            )}
          </div>
        </Dialog>
      )}
    </>
  )
}

function PaymentDetailSection({
  icon: Icon,
  title,
  children
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <section className='rounded-2xl border border-border bg-card p-4'>
      <div className='mb-4 flex items-center gap-3 border-b border-border pb-3'>
        <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
          <Icon className='size-4' />
        </div>
        <h3 className='text-xs font-bold text-foreground'>{title}</h3>
      </div>
      {children}
    </section>
  )
}

function PaymentTimelineStep({
  label,
  detail,
  state
}: {
  label: string
  detail?: ReactNode
  state: 'complete' | 'current' | 'pending' | 'stopped'
}) {
  const Icon = state === 'complete' ? Check : state === 'stopped' ? XCircle : Circle
  return (
    <div
      className={`rounded-xl border p-3 ${
        state === 'complete' || state === 'current'
          ? 'border-primary/25 bg-primary/5'
          : state === 'stopped'
            ? 'border-destructive/25 bg-destructive/5'
            : 'border-border bg-muted/30'
      }`}
    >
      <div className='flex items-center gap-2'>
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
            state === 'complete'
              ? 'bg-primary text-primary-foreground'
              : state === 'current'
                ? 'border border-primary bg-background text-primary'
                : state === 'stopped'
                  ? 'bg-destructive text-destructive-foreground'
                  : 'border border-border bg-background text-muted-foreground'
          }`}
        >
          <Icon className='size-3.5' />
        </span>
        <p className='text-xs font-bold text-foreground'>{label}</p>
      </div>
      <p className='mt-2 pl-8 text-[11px] leading-5 text-muted-foreground'>{detail || '—'}</p>
    </div>
  )
}

function PaymentFact({ label, value, emptyValue }: { label: string; value?: ReactNode; emptyValue?: string }) {
  const { t } = useTranslation('board')
  return (
    <div>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='mt-1 break-words font-semibold text-foreground'>
        {value || emptyValue || t('payments.notAvailable')}
      </dd>
    </div>
  )
}

function formatDate(value: string | null, locale?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value
}
