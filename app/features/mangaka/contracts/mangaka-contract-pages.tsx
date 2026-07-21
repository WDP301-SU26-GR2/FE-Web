import { ArrowLeft, FileSignature, KeyRound, Loader2 } from 'lucide-react'
import { Link, useFetcher } from 'react-router'
import { useState, type ReactNode } from 'react'
import type {
  AmendmentResDtoOutput,
  ContractResDtoOutput,
  ContractStatusProgressResDtoOutput,
  PaymentConditionResDtoOutput
} from '~/api/model/contracts'
import { ContractDecisionBasis } from '~/features/contracts/components/contract-decision-basis'
import { ContractPdfButton } from '~/features/contracts/components/contract-pdf-button'
import { PaymentConditionsSummary } from '~/features/contracts/components/payment-conditions-summary'
import { Dialog } from '~/shared/ui/dialog'
import { hasValidPaymentCondition } from '~/shared/lib/contracts/payment-conditions'

export type MangakaContractActionResult = {
  ok: boolean
  intent: string
  message?: string
}

const inputClass =
  'h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary'

export function MangakaContractsPage({ contracts }: { contracts: ContractResDtoOutput[] }) {
  return (
    <div className='space-y-6 pb-12'>
      <header>
        <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <FileSignature className='size-4' />
          Hợp đồng
        </div>
        <h1 className='mt-2 text-2xl font-bold text-foreground md:text-3xl'>Hợp đồng của tôi</h1>
        <p className='mt-2 text-sm text-muted-foreground'>Xem điều khoản, phản hồi và hoàn tất ký hợp đồng.</p>
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
                  Hợp đồng — {contract.series?.title ?? 'Chưa xác định bộ truyện'}
                </h2>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Bộ truyện: {contract.series?.title ?? 'Chưa xác định'}
                </p>
              </div>
              <StatusBadge value={contract.status} />
            </div>
            <div className='mt-4 grid grid-cols-2 gap-3 text-sm'>
              <Metric label='Loại hợp đồng' value={contract.contractType.replaceAll('_', ' ')} />
              <Metric label='Giá trị' value={formatMoney(contract.valuationAmount)} />
            </div>
          </Link>
        ))}
        {!contracts.length && (
          <div className='rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground xl:col-span-2'>
            Bạn chưa có hợp đồng nào.
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
  conditionsLoadFailed = false
}: {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
  progressLoadFailed?: boolean
  conditions: PaymentConditionResDtoOutput[]
  amendments: AmendmentResDtoOutput[]
  conditionsLoadFailed?: boolean
}) {
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
          <ArrowLeft className='size-4' /> Danh sách hợp đồng
        </Link>
        <div className='mt-4 flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-bold text-foreground'>
              Hợp đồng — {contract.series?.title ?? 'Chưa xác định bộ truyện'}
            </h1>
            <p className='mt-1 text-sm text-muted-foreground'>Bộ truyện: {contract.series?.title ?? 'Chưa xác định'}</p>
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

      <Panel title='Điều khoản hợp đồng'>
        <div className='grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4'>
          <Metric label='Loại hợp đồng' value={contract.contractType.replaceAll('_', ' ')} />
          <Metric label='Giá trị' value={formatMoney(contract.valuationAmount)} />
          <Metric label='NXB sở hữu' value={`${contract.publisherOwnershipPct ?? 0}%`} />
          <Metric label='Mangaka sở hữu' value={`${contract.mangakaOwnershipPct ?? 0}%`} />
          <Metric label='Bắt đầu' value={formatDate(contract.contractStart)} />
          <Metric label='Kết thúc' value={formatDate(contract.contractEnd)} />
        </div>
        <div className='mt-5 rounded-lg bg-muted/50 p-4'>
          <p className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>Điều khoản chấm dứt</p>
          <p className='mt-2 whitespace-pre-wrap text-sm text-foreground'>
            {contract.terminationClause || 'Không có.'}
          </p>
        </div>
      </Panel>

      <Panel title='Thao tác của Mangaka' className='order-4'>
        {!conditionsReady && (
          <p className='mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive'>
            Không thể đồng ý hoặc ký cho tới khi tải được ít nhất một điều kiện thanh toán hợp lệ.
          </p>
        )}
        {progress && (
          <div className='mb-5 grid gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-2'>
            <Metric label='Chữ ký Mangaka' value={progress.mangaka.isSigned ? 'Đã ký' : 'Chưa ký'} />
            <Metric
              label='Tiến độ chữ ký Hội đồng'
              value={`${progress.boardProgress.totalSigned}/${progress.boardProgress.totalRequired}`}
            />
          </div>
        )}
        {progressLoadFailed && (
          <p className='mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200'>
            Không thể tải tiến độ chữ ký mới nhất. Hãy tải lại trang trước khi tiếp tục nếu cần đối chiếu chữ ký.
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
                Đồng ý điều khoản
              </button>
            </fetcher.Form>
            <button
              type='button'
              disabled={isWorking}
              onClick={() => setRequestChangesOpen(true)}
              className='h-10 rounded-md border border-border px-4 text-sm font-bold text-foreground disabled:opacity-50'
            >
              Yêu cầu chỉnh sửa
            </button>
          </div>
        )}
        <div className={contract.status === 'MANGAKA_REVIEW' ? 'mt-5 border-t border-border pt-5' : ''}>
          <h3 className='text-sm font-bold text-foreground'>Chữ ký Mangaka</h3>
          <p className='mt-1 text-xs text-muted-foreground'>
            {contract.status === 'BOARD_APPROVED'
              ? 'Hội đồng đã phê duyệt. Hãy nhận OTP và ký hợp đồng.'
              : contract.mangakaSignedAt
                ? `Đã ký lúc ${new Date(contract.mangakaSignedAt).toLocaleString('vi-VN')}.`
                : 'Chỉ mở sau khi Mangaka đồng ý điều khoản và Hội đồng phê duyệt.'}
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
              <KeyRound className='size-4' /> Gửi mã OTP
            </button>
            <input
              name='otpCode'
              inputMode='numeric'
              pattern='[0-9]{6}'
              minLength={6}
              maxLength={6}
              placeholder='OTP 6 số'
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
              Ký hợp đồng
            </button>
          </fetcher.Form>
        </div>
        {contract.status !== 'MANGAKA_REVIEW' && contract.status !== 'BOARD_APPROVED' && !contract.mangakaSignedAt && (
          <p className='text-sm text-muted-foreground'>{contractStatusHint(contract.status)}</p>
        )}
        <ActionFeedback fetcher={fetcher} />
      </Panel>

      <Panel title='Điều kiện thanh toán' className='order-3'>
        <PaymentConditionsSummary conditions={conditions} loadFailed={conditionsLoadFailed} />
      </Panel>

      <Panel title='Phụ lục hợp đồng' className='order-5'>
        <div className='space-y-3'>
          {amendments.map((amendment) => (
            <MangakaAmendmentRow key={amendment.id} contract={contract} amendment={amendment} />
          ))}
          {!amendments.length && <p className='text-sm text-muted-foreground'>Chưa có phụ lục.</p>}
        </div>
      </Panel>

      <Dialog
        open={requestChangesOpen && contract.status === 'MANGAKA_REVIEW'}
        onClose={() => {
          if (!isWorking) setRequestChangesOpen(false)
        }}
        titleId='request-contract-changes-title'
        descriptionId='request-contract-changes-description'
        title='Yêu cầu chỉnh sửa hợp đồng'
        description='Nêu rõ điều khoản cần Editor xem xét và cập nhật.'
        size='md'
        footer={
          <div className='flex justify-end gap-2'>
            <button
              type='button'
              disabled={isWorking}
              onClick={() => setRequestChangesOpen(false)}
              className='h-10 rounded-md border border-border px-4 text-sm font-bold text-foreground disabled:opacity-50'
            >
              Hủy
            </button>
            <button
              type='submit'
              form='request-contract-changes-form'
              disabled={isWorking}
              className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
            >
              {isWorking && <Loader2 className='size-4 animate-spin' />}
              Gửi yêu cầu
            </button>
          </div>
        }
      >
        <fetcher.Form id='request-contract-changes-form' method='post' className='space-y-2'>
          <input type='hidden' name='intent' value='requestChanges' />
          <label htmlFor='contract-change-reason' className='block text-sm font-semibold text-foreground'>
            Lý do chỉnh sửa <span className='text-destructive'>*</span>
          </label>
          <textarea
            id='contract-change-reason'
            name='reason'
            required
            minLength={1}
            maxLength={1000}
            rows={6}
            autoFocus
            placeholder='Ví dụ: Đề nghị điều chỉnh tỷ lệ sở hữu và làm rõ điều khoản chấm dứt hợp đồng.'
            className='w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'
          />
          <p className='text-xs text-muted-foreground'>Bắt buộc, tối đa 1000 ký tự.</p>
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
  const fetcher = useFetcher<MangakaContractActionResult>()
  const canRespond = contract.contractType === 'REVENUE_SHARE' && amendment.status === 'PENDING_SIGNATURES'
  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <strong className='text-sm'>{amendment.reason || 'Phụ lục hợp đồng'}</strong>
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
              Gửi OTP
            </button>
            <input
              name='otpCode'
              inputMode='numeric'
              pattern='[0-9]{6}'
              minLength={6}
              maxLength={6}
              required
              placeholder='OTP 6 số'
              className={`${inputClass} w-36`}
            />
            <button
              name='intent'
              value='signAmendment'
              className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
            >
              Ký phụ lục
            </button>
          </fetcher.Form>
          <fetcher.Form method='post' className='flex flex-wrap items-center gap-2'>
            <input type='hidden' name='amendmentId' value={amendment.id} />
            <input name='reason' required placeholder='Lý do từ chối' className={`${inputClass} min-w-52 flex-1`} />
            <button
              name='intent'
              value='rejectAmendment'
              className='h-10 rounded-md border border-destructive/40 px-3 text-sm font-bold text-destructive'
            >
              Từ chối
            </button>
          </fetcher.Form>
        </div>
      )}
      <ActionFeedback fetcher={fetcher} />
    </article>
  )
}

function ActionFeedback({ fetcher }: { fetcher: { state: string; data?: MangakaContractActionResult } }) {
  if (fetcher.state !== 'idle')
    return (
      <p className='mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground'>
        <Loader2 className='size-3 animate-spin' /> Đang xử lý…
      </p>
    )
  if (!fetcher.data) return null
  return (
    <p className={`mt-3 text-xs font-semibold ${fetcher.data.ok ? 'text-primary' : 'text-destructive'}`}>
      {fetcher.data.ok
        ? fetcher.data.intent === 'sendOtp'
          ? 'Mã OTP đã được gửi tới email của bạn.'
          : 'Thao tác đã được cập nhật.'
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
  return (
    <span className='inline-flex rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold text-secondary-foreground'>
      {value.replaceAll('_', ' ')}
    </span>
  )
}

function contractStatusHint(status: ContractResDtoOutput['status']) {
  if (status === 'DRAFT' || status === 'NEGOTIATION') return 'Editor đang hoàn thiện điều khoản hợp đồng.'
  if (status === 'MANGAKA_APPROVED') return 'Đã đồng ý điều khoản, đang chờ Hội đồng phê duyệt.'
  if (status === 'MANGAKA_SIGNED') return 'Bạn đã ký, đang chờ Hội đồng hoàn tất chữ ký.'
  if (status === 'FULLY_EXECUTED') return 'Hợp đồng đã được ký đầy đủ và có hiệu lực.'
  return 'Hợp đồng hiện không cần thao tác từ bạn.'
}

function formatMoney(value: number | null) {
  return new Intl.NumberFormat('vi-VN').format(value ?? 0)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN')
}
