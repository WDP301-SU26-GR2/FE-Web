import { useEffect, useState } from 'react'
import { Link, useFetcher, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PenLine } from 'lucide-react'
import type { BoardDecisionResDtoOutput } from '~/api/model/board'
import type {
  AssignFullBuyoutBodyDtoConditionsItemType as AssignFullBuyoutConditionType,
  TransferContractResDtoOutput,
  TransferRequestResDtoOutput,
  TransferSignatureListResDtoOutputSignaturesItem
} from '~/api/model/transfer'
import { AssignFullBuyoutBodyDtoConditionsItemType } from '~/api/model/transfer'
import {
  BoardActionDialog,
  boardDialogButton,
  boardDialogInlineActions,
  boardInput,
  BoardFeedback,
  BoardHeader,
  EmptyState,
  StatusBadge
} from '../components/board-ui'
import type { BoardActionResult } from '../types'
import { Dialog } from '~/shared/ui/dialog'
import { MoneyInWords } from '~/shared/components/money-in-words'
import { TransferContractSummary } from '~/shared/components/transfer-contract-summary'
import { Pagination } from '~/shared/components'
import { useAuth } from '~/features/auth/context/auth-context'
import { useOtpCooldown } from '~/shared/hooks'

const TRANSFER_MONEY_MINIMUM = 1
const TRANSFER_MONEY_MAXIMUM = 100_000_000_000
const BOARD_LIST_PAGE_SIZE = 8

export function BoardTransfersPage({
  requests,
  decisions,
  contract,
  approvedContractDecision,
  contractId,
  signatures,
  hasError
}: {
  requests: TransferRequestResDtoOutput[]
  decisions: BoardDecisionResDtoOutput[]
  contract: TransferContractResDtoOutput | null
  approvedContractDecision: BoardDecisionResDtoOutput | null
  contractId: string
  requestId: string
  signatures: TransferSignatureListResDtoOutputSignaturesItem[]
  hasError: boolean
}) {
  const { t, i18n } = useTranslation('board')
  const { session: authSession } = useAuth()
  const [signOpen, setSignOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const hasMangakaA = signatures.some((signature) => signature.role === 'MANGAKA_A')
  const hasMangakaB = signatures.some((signature) => signature.role === 'MANGAKA_B')
  const hasBoard = signatures.some((signature) => signature.role === 'BOARD')
  const isApprovalRosterMember =
    approvedContractDecision?.allowedEditorIds?.includes(authSession?.user.id ?? '') ?? false
  const canBoardSign = Boolean(
    contract?.status === 'B_SIGNED' &&
    approvedContractDecision &&
    isApprovalRosterMember &&
    hasMangakaA &&
    hasMangakaB &&
    !hasBoard
  )
  const statuses = [...new Set(requests.map((item) => item.status))]
  const filteredRequests = requests.filter(
    (item) =>
      (!search ||
        `${item.series?.title ?? ''} ${item.seriesId} ${item.requestingMangaka?.displayName ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (!status || item.status === status)
  )
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / BOARD_LIST_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const from = filteredRequests.length === 0 ? 0 : (currentPage - 1) * BOARD_LIST_PAGE_SIZE + 1
  const to = Math.min(currentPage * BOARD_LIST_PAGE_SIZE, filteredRequests.length)
  const paginatedRequests = filteredRequests.slice(from > 0 ? from - 1 : 0, to)
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader
        title={t('transfers.title')}
        description={t('transfers.description')}
        backHref='/dashboard/board/operations'
      />
      {contract && (
        <TransferContractSummary
          contract={contract}
          locale={i18n.language}
          labels={{
            title: t('transfers.contractSummary.title'),
            description: t('transfers.contractSummary.boardDescription'),
            status: t('transfers.contractSummary.status'),
            statusValue: t(`transfers.contractStatuses.${contract.status}`),
            type: t('transfers.contractSummary.type'),
            typeValue: contract.transferType ? t(`transfers.types.${contract.transferType}`) : t('common.notAvailable'),
            amount: t('transfers.contractSummary.amount'),
            parties: t('transfers.contractSummary.parties'),
            ownership: t('transfers.contractSummary.ownership'),
            publisher: t('transfers.contractSummary.publisher'),
            originalMangaka: t('transfers.contractSummary.originalMangaka'),
            newMangaka: t('transfers.contractSummary.newMangaka'),
            coOwnerRequired: t('transfers.contractSummary.coOwnerRequired'),
            coOwnerNotRequired: t('transfers.contractSummary.coOwnerNotRequired'),
            unknown: t('common.notAvailable')
          }}
        />
      )}
      <div>
        {canBoardSign ? (
          <button
            type='button'
            onClick={() => setSignOpen(true)}
            className={`${boardDialogButton} bg-primary text-primary-foreground`}
          >
            <PenLine className='h-4 w-4' />
            {t('transfers.sign')}
          </button>
        ) : contractId && !approvedContractDecision ? (
          <p className='rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground'>
            {t('contracts.decisionRequired')}
          </p>
        ) : contractId && approvedContractDecision && !isApprovalRosterMember ? (
          <p className='rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground'>
            {t('contracts.notInDecisionRoster')}
          </p>
        ) : contractId ? (
          <p className='rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground'>
            {hasBoard ? t('transfers.boardAlreadySigned') : t('transfers.awaitingMangakaSignatures')}
          </p>
        ) : (
          <p className='rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground'>
            {t('transfers.openFromNotification')}
          </p>
        )}
      </div>
      {signOpen && <TransferSignDialog contractId={contractId} onClose={() => setSignOpen(false)} />}
      {contractId && (
        <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <h2 className='font-bold text-foreground'>{t('transfers.signatureProgress')}</h2>
          {!!signatures.length && (
            <div className='mt-3 grid gap-2'>
              {signatures.map((signature) => (
                <div key={signature.id} className='flex justify-between rounded-lg border border-border p-3 text-xs'>
                  <span>
                    {t(`transfers.signatureRoles.${signature.role}`, { defaultValue: t('common.notAvailable') })}
                  </span>
                  <span>{new Date(signature.signedAt).toLocaleString(i18n.language)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {hasError && <p className='text-xs text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-2'>
        <input
          className={boardInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('filters.searchTransfers')}
        />
        <select className={boardInput} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value=''>{t('filters.allTransferStatuses')}</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {t(`filters.transferStatuses.${value}`, { defaultValue: t('common.notAvailable') })}
            </option>
          ))}
        </select>
      </div>
      <div className='grid gap-4'>
        {paginatedRequests.map((item) => (
          <TransferCard key={item.id} item={item} decisions={decisions} />
        ))}
      </div>
      {filteredRequests.length > 0 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          setPage={setPage}
          from={from}
          to={to}
          total={filteredRequests.length}
          tKeyPrefix='pagination'
          t={t}
        />
      )}
      {!filteredRequests.length && <EmptyState text={t('transfers.empty')} />}
    </div>
  )
}

function TransferSignDialog({ contractId, onClose }: { contractId: string; onClose: () => void }) {
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
      titleId='board-transfer-sign-title'
      title={t('transfers.sign')}
      description={t('transfers.signInstruction')}
      size='sm'
    >
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='contractId' value={contractId} />
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
          <button type='button' onClick={onClose} className={`${boardDialogButton} border border-border`}>
            {t('common.cancel')}
          </button>
          <button
            name='intent'
            value='sign'
            disabled={fetcher.state !== 'idle'}
            className={`${boardDialogButton} bg-primary text-primary-foreground disabled:opacity-60`}
          >
            {t('transfers.sign')}
          </button>
        </div>
      </fetcher.Form>
      {fetcher.data?.intent === 'sendOtp' && (
        <p className={`text-xs ${fetcher.data.ok ? 'text-primary' : 'text-destructive'}`}>
          {fetcher.data.ok ? t('messages.otpSent') : t('common.failure')}
        </p>
      )}
      <BoardFeedback data={fetcher.data?.intent === 'sign' ? fetcher.data : undefined} />
    </Dialog>
  )
}

function TransferCard({
  item,
  decisions
}: {
  item: TransferRequestResDtoOutput
  decisions: BoardDecisionResDtoOutput[]
}) {
  const { t } = useTranslation('board')
  const navigate = useNavigate()
  const fetcher = useFetcher<BoardActionResult>()
  const fullBuyoutFetcher = useFetcher<BoardActionResult>()
  const currentItem = fullBuyoutFetcher.data?.request ?? fetcher.data?.request ?? item
  const eligibleDecisions = decisions.filter((decision) => {
    return (
      (decision.targetSeriesId ?? decision.targetSeries?.id) === currentItem.seriesId &&
      (typeof decision.details?.transferRequestId !== 'string' || decision.details.transferRequestId === currentItem.id)
    )
  })
  const [decisionId, setDecisionId] = useState('')
  const selectedDecisionId = decisionId || (eligibleDecisions.length === 1 ? eligibleDecisions[0].id : '')
  const selectedDecision = eligibleDecisions.find((decision) => decision.id === selectedDecisionId)

  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      fetcher.data?.ok &&
      fetcher.data.request &&
      ['approve', 'reject'].includes(fetcher.data.intent)
    ) {
      navigate(`/dashboard/board/transfers?requestId=${encodeURIComponent(fetcher.data.request.id)}`, {
        replace: true,
        preventScrollReset: true
      })
    }
  }, [fetcher.data, fetcher.state, navigate])

  return (
    <article className='rounded-xl border border-border bg-card p-5'>
      <div className='flex justify-between gap-3'>
        <div>
          <strong>{currentItem.series?.title ?? t('transfers.unknownSeries')}</strong>
          <p className='mt-1 text-xs text-muted-foreground'>
            {t(`transfers.types.${currentItem.proposedType}`, {
              defaultValue: t('common.notAvailable')
            })}{' '}
            · {currentItem.requestingMangaka?.displayName ?? t('transfers.unknownMangaka')}
          </p>
        </div>
        <StatusBadge value={currentItem.status} />
      </div>
      <p className='mt-3 text-xs text-muted-foreground'>{currentItem.planDescription}</p>
      {currentItem.status === 'SUBMITTED' && (
        <div className='mt-4'>
          <BoardActionDialog title={t('transfers.review')}>
            <fetcher.Form method='post' className='mt-4 grid gap-2 sm:grid-cols-2'>
              <input type='hidden' name='requestId' value={currentItem.id} />
              <p className='rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground sm:col-span-2'>
                {t('transfers.decisionHelp')}
              </p>
              <select
                className={`${boardInput} sm:col-span-2`}
                name='boardDecisionId'
                required
                value={selectedDecisionId}
                onChange={(event) => setDecisionId(event.target.value)}
              >
                <option value='' disabled>
                  {t('transfers.decision')}
                </option>
                {eligibleDecisions.map((decision) => (
                  <option key={decision.id} value={decision.id}>
                    {t(`filters.decisionResults.${decision.result}`, { defaultValue: t('common.notAvailable') })} ·{' '}
                    {decision.targetSeries?.title ?? currentItem.series?.title ?? t('transfers.unknownSeries')}
                  </option>
                ))}
              </select>
              {!eligibleDecisions.length && (
                <div className='space-y-2 rounded-lg bg-slate-900 dark:bg-slate-800 p-3 shadow-md sm:col-span-2'>
                  <p className='text-xs font-medium text-slate-100'>{t('transfers.noTerminalDecision')}</p>
                  <Link
                    className='inline-flex text-xs font-bold text-amber-400 hover:text-amber-300 underline'
                    to='/dashboard/board/sessions'
                  >
                    {t('transfers.openBoardSessions')}
                  </Link>
                </div>
              )}
              <input className={boardInput} name='details' placeholder={t('transfers.details')} />
              <button
                name='intent'
                value='approve'
                disabled={selectedDecision?.result !== 'APPROVED'}
                className={`${boardDialogButton} bg-primary text-primary-foreground disabled:opacity-50 sm:w-full`}
              >
                {t('transfers.approve')}
              </button>
              <button
                name='intent'
                value='reject'
                disabled={selectedDecision?.result !== 'REJECTED'}
                className={`${boardDialogButton} border border-destructive text-destructive disabled:opacity-50 sm:w-full`}
              >
                {t('transfers.reject')}
              </button>
            </fetcher.Form>
            <BoardFeedback data={fetcher.data} />
          </BoardActionDialog>
        </div>
      )}{' '}
      {currentItem.status === 'UNDER_REVIEW' && currentItem.originalContractType === 'FULL_BUYOUT' && (
        <div className='mt-4'>
          <BoardActionDialog title={t('transfers.fullBuyout')}>
            <FullBuyoutForm
              itemId={currentItem.id}
              boardDecisionId={currentItem.boardDecisionId}
              fetcher={fullBuyoutFetcher}
            />
          </BoardActionDialog>
        </div>
      )}
      {currentItem.status === 'AWAITING_REPLACEMENT_SIGNATURES' && (
        <div className='mt-4 rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs leading-5'>
          <p className='text-foreground'>{t('transfers.replacementContractNextStep')}</p>
          <Link
            className='mt-2 inline-flex font-bold text-primary underline'
            to={
              currentItem.replacementContractId || fullBuyoutFetcher.data?.replacementContractId
                ? `/dashboard/board/contracts/${
                    currentItem.replacementContractId ?? fullBuyoutFetcher.data?.replacementContractId
                  }`
                : '/dashboard/board/contracts'
            }
          >
            {t('transfers.openReplacementContracts')}
          </Link>
        </div>
      )}
      {currentItem.status === 'AWAITING_TRANSFER_SIGNATURES' && currentItem.transferContractId && (
        <div className='mt-4 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-5'>
          <p className='text-muted-foreground'>{t('transfers.transferContractSigningStep')}</p>
          <Link
            className='mt-2 inline-flex font-bold text-primary underline'
            to={`?requestId=${encodeURIComponent(currentItem.id)}&contractId=${encodeURIComponent(currentItem.transferContractId)}`}
          >
            {t('transfers.openTransferContract')}
          </Link>
        </div>
      )}
    </article>
  )
}

function FullBuyoutForm({
  itemId,
  boardDecisionId,
  fetcher
}: {
  itemId: string
  boardDecisionId?: string | null
  fetcher: ReturnType<typeof useFetcher<BoardActionResult>>
}) {
  const { t, i18n } = useTranslation('board')
  const [conditionCount, setConditionCount] = useState(1)
  const [valuationAmount, setValuationAmount] = useState<number | null>(null)

  return (
    <>
      <fetcher.Form method='post' className='mt-4 grid gap-3'>
        <input type='hidden' name='requestId' value={itemId} />
        <p className='rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground'>
          {t('transfers.fullBuyoutHelp')}
        </p>
        <label className='grid min-w-0 gap-1.5'>
          <input
            className={boardInput}
            name='valuationAmount'
            type='number'
            min={TRANSFER_MONEY_MINIMUM}
            max={TRANSFER_MONEY_MAXIMUM}
            step={1}
            placeholder={t('contracts.valuation')}
            onChange={(event) => setValuationAmount(event.target.value ? Number(event.target.value) : null)}
            required
          />
          <MoneyInWords amount={valuationAmount} locale={i18n.language} />
        </label>
        <div className='space-y-3 rounded-lg border border-border p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <strong className='min-w-0 text-pretty text-xs'>{t('transfers.newContractConditions')}</strong>
            <button
              type='button'
              onClick={() => setConditionCount((count) => count + 1)}
              className='text-xs font-bold text-primary'
            >
              {t('transfers.addCondition')}
            </button>
          </div>
          {Array.from({ length: conditionCount }, (_, index) => (
            <div key={index} className='grid gap-2 rounded-md bg-muted/50 p-3 sm:grid-cols-2'>
              <select
                className={boardInput}
                name='conditionType'
                defaultValue={AssignFullBuyoutBodyDtoConditionsItemType.CHAPTER_MILESTONE}
              >
                {(Object.values(AssignFullBuyoutBodyDtoConditionsItemType) as AssignFullBuyoutConditionType[]).map(
                  (type) => (
                    <option key={type} value={type}>
                      {t(`transfers.conditionTypes.${type}`)}
                    </option>
                  )
                )}
              </select>
              <input
                className={boardInput}
                name='conditionValue'
                type='number'
                min={1}
                placeholder={t('transfers.conditionValue')}
                required
              />
              <input
                className={`${boardInput} sm:col-span-2`}
                name='conditionDescription'
                placeholder={t('transfers.conditionDescription')}
                required
              />
              {conditionCount > 1 && (
                <button
                  type='button'
                  onClick={() => setConditionCount((count) => Math.max(1, count - 1))}
                  className='justify-self-start text-xs font-bold text-destructive'
                >
                  {t('transfers.removeLastCondition')}
                </button>
              )}
            </div>
          ))}
        </div>
        {!boardDecisionId && <p className='text-xs text-destructive'>{t('transfers.missingDecisionLink')}</p>}
        <button
          name='intent'
          value='fullBuyout'
          disabled={!boardDecisionId}
          className={`${boardDialogButton} bg-primary text-primary-foreground disabled:opacity-50`}
        >
          {t('transfers.fullBuyout')}
        </button>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </>
  )
}
