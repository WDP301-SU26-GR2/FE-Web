import { useEffect, useState } from 'react'
import { Link, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PenLine, ShieldAlert } from 'lucide-react'
import type {
  AmendmentResDtoOutput,
  ContractResDtoOutput,
  ContractStatusProgressResDtoOutput,
  ContractVersionResDtoOutput,
  ContractCommentListResDtoOutputDataItem,
  PaymentConditionListResDtoOutputDataItem
} from '~/api/model/contracts'
import type { BoardDecisionResDtoOutput } from '~/api/model/board'
import {
  boardDialogButton,
  boardDialogInlineActions,
  boardInput,
  BoardFeedback,
  BoardHeader,
  BoardPanel,
  StatusBadge
} from '../components/board-ui'
import type { BoardActionResult } from '../types'
import { Dialog } from '~/shared/ui/dialog'
import { ContractDecisionBasis, ContractPdfButton, PaymentConditionsSummary } from '~/shared/components/contracts'
import { MoneyInWords } from '~/shared/components/money-in-words'
import { useAuth } from '~/features/auth/context/auth-context'
import { useOtpCooldown } from '~/shared/hooks'

export function BoardContractDetailPage({
  contract,
  approvedAmendmentDecisions = [],
  isContractRosterMember = false,
  progress,
  amendments,
  conditions,
  versions,
  comments,
  conditionsLoadFailed = false,
  hasSupplementaryDataError = false
}: {
  contract: ContractResDtoOutput
  approvedAmendmentDecisions?: BoardDecisionResDtoOutput[]
  isContractRosterMember?: boolean
  progress: ContractStatusProgressResDtoOutput | null
  amendments: AmendmentResDtoOutput[]
  conditions: PaymentConditionListResDtoOutputDataItem[]
  versions: ContractVersionResDtoOutput[]
  comments: ContractCommentListResDtoOutputDataItem[]
  conditionsLoadFailed?: boolean
  hasSupplementaryDataError?: boolean
}) {
  const { t, i18n } = useTranslation('board')
  const { session: authSession } = useAuth()
  const fetcher = useFetcher<BoardActionResult>()
  const [signOpen, setSignOpen] = useState(false)
  const [representativeAction, setRepresentativeAction] = useState<'claim' | 'release' | null>(null)
  const currentUserId = authSession?.user.id ?? ''
  const isRepresentative = Boolean(currentUserId && contract.representativeId === currentUserId)
  const validConditionCount = conditions.filter(
    (condition) =>
      condition.status !== 'DISABLED' && ((condition.payoutAmount ?? 0) > 0 || (condition.payoutPct ?? 0) > 0)
  ).length
  const conditionsReady = !conditionsLoadFailed && validConditionCount > 0
  const canClaim = isContractRosterMember && contract.status === 'BOARD_REVIEW' && !contract.representativeId
  const canRelease = contract.status === 'BOARD_REVIEW' && isRepresentative && !contract.representativeSignedAt
  const canSignContract = conditionsReady && contract.status === 'BOARD_REVIEW' && isRepresentative
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader
        title={`${t('contracts.detail')} — ${contract.series?.title ?? t('contracts.unknownSeries')}`}
        description={t(`filters.contractTypes.${contract.contractType}`, { defaultValue: t('common.notAvailable') })}
        backHref='/dashboard/board/contracts'
      />
      <div className='flex justify-end'>
        <ContractPdfButton contract={contract} />
      </div>
      <ContractDecisionBasis contract={contract} decisionPath='/dashboard/board/decisions' />
      {hasSupplementaryDataError && (
        <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive'>
          {t('contracts.partialLoadError')}
        </p>
      )}
      <BoardPanel title={t('contracts.terms')}>
        <div className='grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3'>
          <div>
            <span className='text-muted-foreground'>{t('common.status')}</span>
            <div className='mt-1'>
              <StatusBadge value={contract.status} />
            </div>
          </div>
          <div>
            <span className='text-muted-foreground'>{t('contracts.valuation')}</span>
            <p className='mt-1 font-bold'>
              {new Intl.NumberFormat(i18n.language).format(contract.valuationAmount ?? 0)}
            </p>
            <MoneyInWords amount={contract.valuationAmount} locale={i18n.language} />
          </div>
          <div>
            <span className='text-muted-foreground'>{t('contracts.contractType')}</span>
            <p className='mt-1 font-bold'>{t(`filters.contractTypes.${contract.contractType}`)}</p>
          </div>
          <div>
            <span className='text-muted-foreground'>{t('contracts.ownership')}</span>
            <p className='mt-1 font-bold'>
              {contract.publisherOwnershipPct ?? 0}% / {contract.mangakaOwnershipPct ?? 0}%
            </p>
          </div>
          <div>
            <span className='text-muted-foreground'>{t('contracts.startDate')}</span>
            <p className='mt-1 font-bold'>{formatDate(contract.contractStart, i18n.language)}</p>
          </div>
          <div>
            <span className='text-muted-foreground'>{t('contracts.endDate')}</span>
            <p className='mt-1 font-bold'>{formatDate(contract.contractEnd, i18n.language)}</p>
          </div>
        </div>
        <p className='mt-4 text-xs text-muted-foreground'>{contract.terminationClause}</p>
        <p className='mt-3 text-xs text-muted-foreground'>
          {contract.mangaka?.displayName ?? t('contracts.unknownMangaka')}
          {contract.editor ? ` · ${contract.editor.displayName}` : ''}
        </p>
      </BoardPanel>
      <div className='space-y-4'>
        <BoardPanel title={t('contracts.conditions')}>
          <PaymentConditionsSummary conditions={conditions} loadFailed={conditionsLoadFailed} />
        </BoardPanel>
        <BoardPanel title={t('contracts.versions')}>
          <div className='space-y-2'>
            {versions.map((version) => (
              <div key={version.id} className='rounded-lg border border-border p-3 text-xs'>
                <strong>v{version.versionNumber}</strong>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {new Date(version.createdAt).toLocaleString(i18n.language)} · {version.note || '—'}
                </p>
              </div>
            ))}
            {!versions.length && <p className='text-xs text-muted-foreground'>{t('contracts.emptyVersions')}</p>}
          </div>
        </BoardPanel>
      </div>
      <BoardPanel title={t('contracts.paymentWorkflow')}>
        <div className='grid gap-4'>
          <div>
            <p className='text-xs text-muted-foreground'>{t('contracts.paymentWorkflowDescription')}</p>
            <Link
              to={`/dashboard/board/payments?contractId=${encodeURIComponent(contract.id)}`}
              className='mt-2 inline-flex text-xs font-bold text-primary'
            >
              {t('contracts.openPayments')}
            </Link>
          </div>
          {contract.contractType === 'REVENUE_SHARE' && contract.status === 'FULLY_EXECUTED' && (
            <fetcher.Form method='post' className='grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2'>
              <input
                className={boardInput}
                name='period'
                minLength={1}
                placeholder={t('contracts.revenuePeriod')}
                required
              />
              <input
                className={boardInput}
                name='revenue'
                type='number'
                min='0.01'
                step='0.01'
                placeholder={t('contracts.revenueAmount')}
                required
              />
              <button
                name='intent'
                value='reportRevenue'
                disabled={fetcher.state !== 'idle'}
                className={`${boardDialogButton} bg-primary text-primary-foreground disabled:opacity-60 sm:col-span-2 sm:w-full`}
              >
                {t('contracts.reportRevenue')}
              </button>
            </fetcher.Form>
          )}
          <BoardFeedback data={fetcher.data?.intent === 'reportRevenue' ? fetcher.data : undefined} />
        </div>
      </BoardPanel>
      <BoardPanel title={t('contracts.actions')}>
        {contract.status === 'BOARD_REVIEW' && !isContractRosterMember && !isRepresentative && (
          <p className='mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground'>
            {t('contracts.notInDecisionRoster')}
          </p>
        )}
        {!conditionsReady && (
          <div className='mb-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive'>
            <ShieldAlert className='mt-0.5 size-4 shrink-0' />
            <p>
              {conditionsLoadFailed
                ? t('contracts.paymentConditionsUnavailable')
                : t('contracts.paymentConditionsRequired')}
            </p>
          </div>
        )}
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4'>
          <div>
            <h3 className='text-xs font-bold text-foreground'>{t('contracts.representative')}</h3>
            <p className='mt-1 text-xs text-muted-foreground'>
              {contract.representative?.displayName ?? t('contracts.representativeUnassigned')}
              {contract.representativeSignedAt
                ? ` · ${t('contracts.signed')}: ${new Date(contract.representativeSignedAt).toLocaleString(i18n.language)}`
                : ''}
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            {canClaim && (
              <button
                type='button'
                onClick={() => setRepresentativeAction('claim')}
                disabled={fetcher.state !== 'idle'}
                className={`${boardDialogButton} border border-border disabled:opacity-50`}
              >
                {t('contracts.claimRepresentative')}
              </button>
            )}
            {canRelease && (
              <button
                type='button'
                onClick={() => setRepresentativeAction('release')}
                disabled={fetcher.state !== 'idle'}
                className={`${boardDialogButton} border border-border disabled:opacity-50`}
              >
                {t('contracts.releaseRepresentative')}
              </button>
            )}
            {canSignContract && (
              <button
                type='button'
                onClick={() => setSignOpen(true)}
              className={`${boardDialogButton} gap-2 bg-primary text-primary-foreground`}
              >
                <PenLine className='h-4 w-4' />
                {t('contracts.signRepresentative')}
              </button>
            )}
          </div>
        </div>
        <BoardFeedback data={fetcher.data} />
        {progress?.representative.claimed && (
          <p className='mt-3 text-xs text-muted-foreground'>
            {progress.representative.signed
              ? t('contracts.representativeSigned')
              : t('contracts.representativePending')}
          </p>
        )}
      </BoardPanel>
      <BoardPanel title={t('contracts.comments')}>
        {contract.status === 'BOARD_REVIEW' && isContractRosterMember && (
          <fetcher.Form method='post' className='mb-4 grid gap-2'>
            <textarea
              name='content'
              required
              minLength={1}
              maxLength={2000}
              rows={3}
              placeholder={t('contracts.commentPlaceholder')}
              className='min-w-0 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground'
            />
            <button
              name='intent'
              value='addComment'
              disabled={fetcher.state !== 'idle'}
              className={`${boardDialogButton} justify-self-end bg-primary text-primary-foreground disabled:opacity-50`}
            >
              {t('contracts.addComment')}
            </button>
          </fetcher.Form>
        )}
        <div className='space-y-2'>
          {comments.map((comment) => (
            <article key={comment.id} className='rounded-lg border border-border p-3 text-xs'>
              <div className='flex justify-between gap-3'>
                <strong>{comment.author?.displayName ?? t('contracts.boardMember')}</strong>
                <time className='text-muted-foreground'>
                  {new Date(comment.createdAt).toLocaleString(i18n.language)}
                </time>
              </div>
              <p className='mt-2 whitespace-pre-wrap text-muted-foreground'>{comment.content}</p>
            </article>
          ))}
          {!comments.length && <p className='text-xs text-muted-foreground'>{t('contracts.emptyComments')}</p>}
        </div>
      </BoardPanel>
      {signOpen && <ContractSignDialog onClose={() => setSignOpen(false)} />}
      {representativeAction && (
        <RepresentativeConfirmDialog action={representativeAction} onClose={() => setRepresentativeAction(null)} />
      )}
      <BoardPanel title={t('contracts.amendments')}>
        <div className='space-y-3'>
          {amendments.map((item) => (
            <AmendmentRow
              key={item.id}
              contractId={contract.id}
              amendment={item}
              canSign={canSignAmendment(item.id, approvedAmendmentDecisions, authSession?.user.id)}
              awaitingDecision={
                item.status === 'PENDING_SIGNATURES' &&
                !approvedAmendmentDecisions.some((decision) => decision.details?.resourceId === item.id)
              }
            />
          ))}
          {!amendments.length && <p className='text-xs text-muted-foreground'>{t('contracts.emptyAmendments')}</p>}
        </div>
      </BoardPanel>
    </div>
  )
}

function RepresentativeConfirmDialog({ action, onClose }: { action: 'claim' | 'release'; onClose: () => void }) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok && fetcher.data.intent === action) onClose()
  }, [action, fetcher.data, fetcher.state, onClose])

  return (
    <Dialog
      compact
      open
      onClose={onClose}
      titleId={`board-contract-${action}-representative-title`}
      title={t(action === 'claim' ? 'contracts.claimRepresentative' : 'contracts.releaseRepresentative')}
      description={t(
        action === 'claim' ? 'contracts.claimRepresentativeConfirm' : 'contracts.releaseRepresentativeConfirm'
      )}
      size='sm'
    >
      <fetcher.Form method='post' className='grid gap-4'>
        <div className={boardDialogInlineActions}>
          <button
            type='button'
            onClick={onClose}
            className={`${boardDialogButton} border border-border`}
          >
            {t('common.cancel')}
          </button>
          <button
            name='intent'
            value={action}
            disabled={fetcher.state !== 'idle'}
            className={`${boardDialogButton} bg-primary text-primary-foreground disabled:opacity-60`}
          >
            {t(action === 'claim' ? 'contracts.confirmClaimRepresentative' : 'contracts.confirmReleaseRepresentative')}
          </button>
        </div>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data?.intent === action ? fetcher.data : undefined} />
    </Dialog>
  )
}

function AmendmentRow({
  contractId,
  amendment,
  canSign,
  awaitingDecision
}: {
  contractId: string
  amendment: AmendmentResDtoOutput
  canSign: boolean
  awaitingDecision: boolean
}) {
  const { t } = useTranslation('board')
  const [signOpen, setSignOpen] = useState(false)
  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <strong className='min-w-0 text-pretty leading-6'>{amendment.reason ?? t('contracts.amendment')}</strong>
        <StatusBadge value={amendment.status} />
      </div>
      {canSign && amendment.status === 'PENDING_SIGNATURES' && (
        <button
          type='button'
          onClick={() => setSignOpen(true)}
          className={`${boardDialogButton} mt-3 gap-2 bg-primary text-primary-foreground`}
        >
          <PenLine className='h-4 w-4' />
          {t('contracts.signAmendment')}
        </button>
      )}
      {awaitingDecision && (
        <p className='mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground'>
          {t('contracts.amendmentAwaitingDecision')}
        </p>
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
  const { isCoolingDown, remainingSeconds, start } = useOtpCooldown()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok && fetcher.data.intent === 'sign') onClose()
  }, [fetcher.data, fetcher.state, onClose])

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok && fetcher.data.intent === 'sendOtp') start()
  }, [fetcher.data, fetcher.state, start])

  return (
    <Dialog
      compact
      open
      onClose={onClose}
      titleId='board-contract-sign-title'
      title={t('contracts.boardSignature')}
      size='sm'
    >
      <fetcher.Form method='post' className='grid gap-3'>
        <p className='text-xs text-muted-foreground'>{t('contracts.otpInstruction')}</p>
        <input
          className={boardInput}
          name='otpCode'
          minLength={6}
          maxLength={6}
          placeholder={t('contracts.otp')}
          required
        />
        <div className={boardDialogInlineActions}>
          <button
            name='intent'
            value='sendOtp'
            formNoValidate
            disabled={fetcher.state !== 'idle' || isCoolingDown}
            className={`${boardDialogButton} border border-border disabled:opacity-60`}
          >
            {isCoolingDown ? `${t('contracts.sendOtp')} (${remainingSeconds}s)` : t('contracts.sendOtp')}
          </button>
          <button
            type='button'
            onClick={onClose}
            className={`${boardDialogButton} border border-border`}
          >
            {t('common.cancel')}
          </button>
          <button
            name='intent'
            value='sign'
            disabled={fetcher.state !== 'idle'}
            className={`${boardDialogButton} bg-primary text-primary-foreground disabled:opacity-60`}
          >
            {t('contracts.sign')}
          </button>
        </div>
      </fetcher.Form>
      <OtpRequestFeedback data={fetcher.data?.intent === 'sendOtp' ? fetcher.data : undefined} />
      <BoardFeedback data={fetcher.data?.intent === 'sign' ? fetcher.data : undefined} />
    </Dialog>
  )
}

function formatDate(value: string | null, locale: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(locale)
}

function canSignAmendment(
  amendmentId: string,
  decisions: BoardDecisionResDtoOutput[],
  currentUserId: string | undefined
) {
  if (!currentUserId) return false
  const decision = decisions.find((item) => item.details?.resourceId === amendmentId)
  return decision?.allowedEditorIds?.includes(currentUserId) ?? false
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
  const { isCoolingDown, remainingSeconds, start } = useOtpCooldown()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok && fetcher.data.intent === 'signAmendment') onClose()
  }, [fetcher.data, fetcher.state, onClose])

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok && fetcher.data.intent === 'sendOtp') start()
  }, [fetcher.data, fetcher.state, start])

  return (
    <Dialog
      compact
      open
      onClose={onClose}
      titleId={`board-amendment-sign-${amendmentId}`}
      title={t('contracts.signAmendment')}
      size='sm'
    >
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='contractId' value={contractId} />
        <input type='hidden' name='amendmentId' value={amendmentId} />
        <p className='text-xs text-muted-foreground'>{t('contracts.otpInstruction')}</p>
        <input
          className={boardInput}
          name='otpCode'
          minLength={6}
          maxLength={6}
          placeholder={t('contracts.otp')}
          required
        />
        <div className={boardDialogInlineActions}>
          <button
            name='intent'
            value='sendOtp'
            formNoValidate
            disabled={fetcher.state !== 'idle' || isCoolingDown}
            className={`${boardDialogButton} border border-border disabled:opacity-60`}
          >
            {isCoolingDown ? `${t('contracts.sendOtp')} (${remainingSeconds}s)` : t('contracts.sendOtp')}
          </button>
          <button
            type='button'
            onClick={onClose}
            className={`${boardDialogButton} border border-border`}
          >
            {t('common.cancel')}
          </button>
          <button
            name='intent'
            value='signAmendment'
            disabled={fetcher.state !== 'idle'}
            className={`${boardDialogButton} bg-primary text-primary-foreground disabled:opacity-60`}
          >
            {t('contracts.signAmendment')}
          </button>
        </div>
      </fetcher.Form>
      <OtpRequestFeedback data={fetcher.data?.intent === 'sendOtp' ? fetcher.data : undefined} />
      <BoardFeedback data={fetcher.data?.intent === 'signAmendment' ? fetcher.data : undefined} />
    </Dialog>
  )
}

function OtpRequestFeedback({ data }: { data?: BoardActionResult }) {
  const { t } = useTranslation('board')
  if (!data) return null
  return (
    <p className={`mt-3 text-xs ${data.ok ? 'text-primary' : 'text-destructive'}`}>
      {data.ok ? t('messages.otpSent') : t('common.failure')}
    </p>
  )
}
