import { useEffect, useState } from 'react'
import { Link, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Loader2, PenLine, ShieldAlert } from 'lucide-react'
import type {
  AmendmentResDtoOutput,
  ContractResDtoOutput,
  ContractStatusProgressResDtoOutput,
  ContractVersionResDtoOutput,
  PaymentConditionListResDtoOutputDataItem
} from '~/api/model/contracts'
import {
  boardInput,
  BoardActionDialog,
  BoardFeedback,
  BoardHeader,
  BoardPanel,
  StatusBadge
} from '../components/board-ui'
import type { BoardActionResult } from '../types'
import { Dialog } from '~/shared/ui/dialog'
import { ContractDecisionBasis } from '~/features/contracts/components/contract-decision-basis'
import { ContractPdfButton } from '~/features/contracts/components/contract-pdf-button'
import { PaymentConditionsSummary } from '~/features/contracts/components/payment-conditions-summary'
import { getContractBoardRoster } from '~/api/manual/contract-latest'
import { useAuth } from '~/features/auth/context/auth-context'
import { hasValidPaymentCondition } from '~/shared/lib/contracts/payment-conditions'

export function BoardContractDetailPage({
  contract,
  progress,
  amendments,
  conditions,
  versions,
  conditionsLoadFailed = false,
  hasSupplementaryDataError = false
}: {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
  amendments: AmendmentResDtoOutput[]
  conditions: PaymentConditionListResDtoOutputDataItem[]
  versions: ContractVersionResDtoOutput[]
  conditionsLoadFailed?: boolean
  hasSupplementaryDataError?: boolean
}) {
  const { t } = useTranslation('board')
  const { session: authSession } = useAuth()
  const fetcher = useFetcher<BoardActionResult>()
  const [signOpen, setSignOpen] = useState(false)
  const [changesOpen, setChangesOpen] = useState(false)
  const boardRoster = getContractBoardRoster(contract)
  const isRosterMember = boardRoster.includes(authSession?.user.id ?? '')
  const currentBoardSignature = progress?.boardProgress.signedEditors.find(
    (editor) => editor.id === authSession?.user.id
  )
  const hasCurrentMemberSigned = Boolean(currentBoardSignature)
  const conditionsReady = !conditionsLoadFailed && hasValidPaymentCondition(conditions)
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader
        title={`${t('contracts.detail')} — ${contract.series?.title ?? t('contracts.unknownSeries')}`}
        description={t(`filters.contractTypes.${contract.contractType}`, { defaultValue: contract.contractType })}
      />
      <div className='flex justify-end'>
        <ContractPdfButton
          contract={contract}
          conditionsCount={
            conditions.filter(
              (condition) =>
                condition.status !== 'DISABLED' && ((condition.payoutAmount ?? 0) > 0 || (condition.payoutPct ?? 0) > 0)
            ).length
          }
        />
      </div>
      <ContractDecisionBasis contract={contract} decisionPath='/dashboard/board/decisions' />
      {hasSupplementaryDataError && (
        <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
          {t('contracts.partialLoadError')}
        </p>
      )}
      <BoardPanel title={t('contracts.terms')}>
        <div className='grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3'>
          <div>
            <span className='text-muted-foreground'>{t('common.status')}</span>
            <div className='mt-1'>
              <StatusBadge value={contract.status} />
            </div>
          </div>
          <div>
            <span className='text-muted-foreground'>{t('contracts.valuation')}</span>
            <p className='mt-1 font-bold'>{new Intl.NumberFormat().format(contract.valuationAmount ?? 0)}</p>
          </div>
          <div>
            <span className='text-muted-foreground'>Loại hợp đồng</span>
            <p className='mt-1 font-bold'>{t(`filters.contractTypes.${contract.contractType}`)}</p>
          </div>
          <div>
            <span className='text-muted-foreground'>{t('contracts.ownership')}</span>
            <p className='mt-1 font-bold'>
              {contract.publisherOwnershipPct ?? 0}% / {contract.mangakaOwnershipPct ?? 0}%
            </p>
          </div>
          <div>
            <span className='text-muted-foreground'>Ngày bắt đầu</span>
            <p className='mt-1 font-bold'>{formatDate(contract.contractStart)}</p>
          </div>
          <div>
            <span className='text-muted-foreground'>Ngày kết thúc</span>
            <p className='mt-1 font-bold'>{formatDate(contract.contractEnd)}</p>
          </div>
        </div>
        <p className='mt-4 text-sm text-muted-foreground'>{contract.terminationClause}</p>
        <p className='mt-3 text-xs text-muted-foreground'>
          {contract.mangaka?.displayName ?? contract.mangakaId}
          {contract.editor ? ` · ${contract.editor.displayName}` : ''}
        </p>
      </BoardPanel>
      <div className='grid gap-4 lg:grid-cols-2'>
        <BoardPanel title={t('contracts.conditions')}>
          <PaymentConditionsSummary conditions={conditions} loadFailed={conditionsLoadFailed} />
        </BoardPanel>
        <BoardPanel title={t('contracts.versions')}>
          <div className='space-y-2'>
            {versions.map((version) => (
              <div key={version.id} className='rounded-lg border border-border p-3 text-sm'>
                <strong>v{version.versionNumber}</strong>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {new Date(version.createdAt).toLocaleString()} · {version.note || '—'}
                </p>
              </div>
            ))}
            {!versions.length && <p className='text-sm text-muted-foreground'>{t('contracts.emptyVersions')}</p>}
          </div>
        </BoardPanel>
      </div>
      <BoardPanel title={t('contracts.paymentWorkflow')}>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-sm text-muted-foreground'>{t('contracts.paymentWorkflowDescription')}</p>
            <Link
              to={`/dashboard/board/payments?contractId=${encodeURIComponent(contract.id)}`}
              className='mt-2 inline-flex text-sm font-bold text-primary'
            >
              {t('contracts.openPayments')}
            </Link>
          </div>
          {contract.contractType === 'REVENUE_SHARE' && contract.status === 'FULLY_EXECUTED' && (
            <BoardActionDialog title={t('contracts.reportRevenue')}>
              <fetcher.Form method='post' className='grid gap-3'>
                <input name='period' required className={boardInput} placeholder={t('contracts.revenuePeriod')} />
                <input
                  name='revenue'
                  required
                  type='number'
                  min={0.01}
                  step='any'
                  className={boardInput}
                  placeholder={t('contracts.revenueAmount')}
                />
                <button
                  name='intent'
                  value='reportRevenue'
                  disabled={fetcher.state !== 'idle'}
                  className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
                >
                  {t('contracts.reportRevenue')}
                </button>
              </fetcher.Form>
              <BoardFeedback data={fetcher.data?.intent === 'reportRevenue' ? fetcher.data : undefined} />
            </BoardActionDialog>
          )}
        </div>
      </BoardPanel>
      <BoardPanel title={t('contracts.actions')}>
        {!conditionsReady && (
          <div className='mb-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
            <ShieldAlert className='mt-0.5 size-4 shrink-0' />
            <p>Không thể duyệt hoặc ký cho tới khi tải được ít nhất một điều kiện thanh toán hợp lệ.</p>
          </div>
        )}
        {!isRosterMember && (
          <div className='mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200'>
            <ShieldAlert className='mt-0.5 size-4 shrink-0' />
            <p>
              Bạn có thể xem hợp đồng, nhưng chỉ thành viên thuộc phiên Hội đồng đã phê duyệt serial hóa mới được duyệt
              hoặc ký.
            </p>
          </div>
        )}
        <fetcher.Form method='post' className='grid gap-3'>
          <div className='flex flex-wrap gap-2'>
            {isRosterMember && contract.status === 'MANGAKA_APPROVED' && (
              <>
                <button
                  name='intent'
                  value='approve'
                  disabled={fetcher.state !== 'idle' || !conditionsReady}
                  className='h-9 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {t('contracts.approve')}
                </button>
                <button
                  type='button'
                  onClick={() => setChangesOpen(true)}
                  className='h-9 rounded-md border border-border px-3 text-sm font-bold'
                >
                  {t('contracts.changes')}
                </button>
              </>
            )}
            <div className='flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4'>
              <div>
                <h3 className='text-sm font-bold text-foreground'>{t('contracts.boardSignature')}</h3>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {hasCurrentMemberSigned
                    ? `${t('contracts.signed')}: ${new Date(currentBoardSignature!.actionAt).toLocaleString()}`
                    : contract.status === 'MANGAKA_SIGNED'
                      ? t('contracts.readyToSign')
                      : contract.boardSignedAt
                        ? `${t('contracts.signed')}: ${new Date(contract.boardSignedAt).toLocaleString()}`
                        : t('contracts.waitingMangakaSignature')}
                </p>
              </div>
              {isRosterMember && !hasCurrentMemberSigned && contract.status === 'MANGAKA_SIGNED' && (
                <button
                  type='button'
                  disabled={!conditionsReady}
                  onClick={() => setSignOpen(true)}
                  className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50'
                >
                  <PenLine className='h-4 w-4' />
                  {t('contracts.sign')}
                </button>
              )}
            </div>
          </div>
        </fetcher.Form>
        <BoardFeedback data={fetcher.data} />
        {progress && (
          <p className='mt-3 text-xs text-muted-foreground'>
            {t('contracts.signatures', {
              signed: progress.boardProgress.totalSigned,
              required: progress.boardProgress.totalRequired
            })}
          </p>
        )}
      </BoardPanel>
      <Dialog
        open={isRosterMember && changesOpen && contract.status === 'MANGAKA_APPROVED'}
        onClose={() => {
          if (fetcher.state === 'idle') setChangesOpen(false)
        }}
        titleId='board-contract-request-changes-title'
        title={t('contracts.changes')}
        description={t('contracts.changeReasonDescription')}
        size='md'
      >
        <fetcher.Form method='post' className='grid gap-3'>
          <label htmlFor='board-contract-change-reason' className='text-sm font-semibold text-foreground'>
            {t('contracts.changeReason')} <span className='text-destructive'>*</span>
          </label>
          <textarea
            id='board-contract-change-reason'
            name='reason'
            required
            minLength={1}
            maxLength={1000}
            rows={6}
            autoFocus
            placeholder={t('contracts.changeReasonPlaceholder')}
            className='w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'
          />
          <p className='text-xs text-muted-foreground'>{t('contracts.changeReasonLimit')}</p>
          <div className='flex justify-end gap-2'>
            <button
              type='button'
              disabled={fetcher.state !== 'idle'}
              onClick={() => setChangesOpen(false)}
              className='h-10 rounded-md border border-border px-4 text-sm font-bold disabled:opacity-50'
            >
              {t('common.cancel')}
            </button>
            <button
              name='intent'
              value='changes'
              disabled={fetcher.state !== 'idle'}
              className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
            >
              {fetcher.state !== 'idle' && <Loader2 className='size-4 animate-spin' />}
              {t('contracts.sendChangeRequest')}
            </button>
          </div>
        </fetcher.Form>
        <BoardFeedback data={fetcher.data?.intent === 'changes' ? fetcher.data : undefined} />
      </Dialog>
      {signOpen && conditionsReady && <ContractSignDialog onClose={() => setSignOpen(false)} />}
      <BoardPanel title={t('contracts.amendments')}>
        <div className='space-y-3'>
          {amendments.map((item) => (
            <AmendmentRow key={item.id} contractId={contract.id} amendment={item} canSign={isRosterMember} />
          ))}
          {!amendments.length && <p className='text-sm text-muted-foreground'>{t('contracts.emptyAmendments')}</p>}
        </div>
      </BoardPanel>
    </div>
  )
}

function AmendmentRow({
  contractId,
  amendment,
  canSign
}: {
  contractId: string
  amendment: AmendmentResDtoOutput
  canSign: boolean
}) {
  const { t } = useTranslation('board')
  const [signOpen, setSignOpen] = useState(false)
  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex justify-between gap-3'>
        <strong>{amendment.reason ?? t('contracts.amendment')}</strong>
        <StatusBadge value={amendment.status} />
      </div>
      {canSign && amendment.status === 'PENDING_SIGNATURES' && (
        <button
          type='button'
          onClick={() => setSignOpen(true)}
          className='mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
        >
          <PenLine className='h-4 w-4' />
          {t('contracts.signAmendment')}
        </button>
      )}
      {signOpen && (
        <AmendmentSignDialog contractId={contractId} amendmentId={amendment.id} onClose={() => setSignOpen(false)} />
      )}
    </article>
  )
}

function ContractSignDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok && fetcher.data.intent === 'sign') onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <Dialog open onClose={onClose} titleId='board-contract-sign-title' title={t('contracts.boardSignature')} size='sm'>
      <fetcher.Form method='post' className='grid gap-3'>
        <p className='text-sm text-muted-foreground'>{t('contracts.otpInstruction')}</p>
        <button
          type='submit'
          name='intent'
          value='sendOtp'
          formNoValidate
          disabled={fetcher.state !== 'idle'}
          className='h-10 rounded-md border border-border px-3 text-sm font-bold disabled:opacity-60'
        >
          {t('contracts.sendOtp')}
        </button>
        <input
          className={boardInput}
          name='otpCode'
          minLength={6}
          maxLength={6}
          placeholder={t('contracts.otp')}
          required
        />
        <div className='flex justify-end gap-2'>
          <button
            type='button'
            onClick={onClose}
            className='h-10 rounded-md border border-border px-4 text-sm font-bold'
          >
            {t('common.cancel')}
          </button>
          <button
            name='intent'
            value='sign'
            disabled={fetcher.state !== 'idle'}
            className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60'
          >
            {t('contracts.sign')}
          </button>
        </div>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </Dialog>
  )
}

function formatDate(value: string | null) {
  if (!value) return 'Chưa xác định'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN')
}

function AmendmentSignDialog({
  contractId,
  amendmentId,
  onClose
}: {
  contractId: string
  amendmentId: string
  onClose: () => void
}) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok && fetcher.data.intent === 'signAmendment') onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <Dialog
      open
      onClose={onClose}
      titleId={`board-amendment-sign-${amendmentId}`}
      title={t('contracts.signAmendment')}
      size='sm'
    >
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='contractId' value={contractId} />
        <input type='hidden' name='amendmentId' value={amendmentId} />
        <p className='text-sm text-muted-foreground'>{t('contracts.otpInstruction')}</p>
        <button
          type='submit'
          name='intent'
          value='sendOtp'
          formNoValidate
          disabled={fetcher.state !== 'idle'}
          className='h-10 rounded-md border border-border px-3 text-sm font-bold disabled:opacity-60'
        >
          {t('contracts.sendOtp')}
        </button>
        <input
          className={boardInput}
          name='otpCode'
          minLength={6}
          maxLength={6}
          placeholder={t('contracts.otp')}
          required
        />
        <div className='flex justify-end gap-2'>
          <button
            type='button'
            onClick={onClose}
            className='h-10 rounded-md border border-border px-4 text-sm font-bold'
          >
            {t('common.cancel')}
          </button>
          <button
            name='intent'
            value='signAmendment'
            disabled={fetcher.state !== 'idle'}
            className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60'
          >
            {t('contracts.signAmendment')}
          </button>
        </div>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </Dialog>
  )
}
