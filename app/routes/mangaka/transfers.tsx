import { useEffect, useState } from 'react'
import { ArrowRightLeft, CheckCircle2, FileCheck2, Loader2, Plus, ShieldCheck, UsersRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useFetcher } from 'react-router'

import type { PublicSeriesListResDtoOutputItemsItem } from '~/api/model/public'
import type {
  TransferContractResDtoOutput,
  TransferRequestResDtoOutput,
  TransferSignatureListResDtoOutputSignaturesItem
} from '~/api/model/transfer'
import { authControllerSendOtp } from '~/api/operations/auth/auth'
import { publicControllerGetSeriesDetail, publicControllerListSeries } from '~/api/operations/public/public'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import {
  isTransferEligibleSeriesStatus,
  loadPublicSeriesCatalog,
  selectEligibleTransferSeries
} from '~/features/mangaka'
import {
  transferControllerCreateTransferRequest,
  transferControllerGetTransferRequestById,
  transferControllerGetTransferRequestsByMangaka,
  transferControllerGetSignatures,
  transferControllerGetTransferContractById,
  transferControllerMangakaAcceptTransfer,
  transferControllerMangakaRejectTransfer,
  transferControllerSignTransferContract
} from '~/api/operations/transfer/transfer'
import { usersControllerGetMe } from '~/api/operations/users/users'
import { extractApiErrorCode } from '~/shared/lib/api/extract-api-error'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'
import { cn } from '~/shared/lib/cn'
import { useOtpCooldown } from '~/shared/hooks'
import { Dialog } from '~/shared/ui/dialog'

type ActionResult = { ok: boolean; intent: string; errorKey?: string }

const inputClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground'

const TERMINAL_STATUSES = new Set([
  'REJECTED_BY_BOARD',
  'REJECTED_BY_ORIGINAL_MANGAKA',
  'REJECTED',
  'CANCELLED',
  'COMPLETED'
])

export async function clientLoader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const focusRequestId = url.searchParams.get('requestId')?.trim() ?? ''
  const focusContractId = url.searchParams.get('contractId')?.trim() ?? ''

  const [requestsResponse, publicSeries, ownedSeries, meResponse] = await Promise.all([
    transferControllerGetTransferRequestsByMangaka(),
    loadPublicSeriesCatalog(publicControllerListSeries),
    loadAllOffsetItems((pagination) => seriesControllerListSeries(pagination).then((response) => response.data)),
    usersControllerGetMe()
  ])

  const requestDetails = await Promise.all(
    (requestsResponse.data?.data ?? []).map(async (requestItem) => {
      try {
        const detail = await transferControllerGetTransferRequestById({ id: requestItem.id })
        return detail.data
      } catch {
        return null
      }
    })
  )
  const requests = requestDetails.filter((item): item is TransferRequestResDtoOutput => item !== null)

  let focusRequestLoadFailed = false
  if (focusRequestId && !requests.some((item) => item.id === focusRequestId)) {
    try {
      const incoming = await transferControllerGetTransferRequestById({ id: focusRequestId })
      requests.unshift(incoming.data)
    } catch {
      focusRequestLoadFailed = true
    }
  }

  const discoveredContractId =
    focusContractId || requests.find((item) => item.id === focusRequestId)?.transferContractId || ''
  let focusContract: TransferContractResDtoOutput | null = null
  let contractSignatures: TransferSignatureListResDtoOutputSignaturesItem[] = []
  let signaturesLoadFailed = false
  let focusContractLoadFailed = false
  if (discoveredContractId) {
    const [contractResponse, signatureResponse] = await Promise.all([
      transferControllerGetTransferContractById({ id: discoveredContractId }).catch(() => null),
      transferControllerGetSignatures({ id: discoveredContractId }).catch(() => null)
    ])
    if (contractResponse?.status === 200) {
      focusContract = contractResponse.data
    } else {
      focusContractLoadFailed = true
    }
    if (signatureResponse?.status === 200) {
      contractSignatures = signatureResponse.data.signatures
    } else {
      signaturesLoadFailed = true
    }
  }

  return {
    requests,
    series: selectEligibleTransferSeries(publicSeries, ownedSeries),
    currentUserId: meResponse.data.id,
    focusRequestId,
    focusRequestLoadFailed,
    focusContractId: discoveredContractId,
    focusContract,
    focusContractLoadFailed,
    contractSignatures,
    signaturesLoadFailed
  }
}

export async function clientAction({ request }: { request: Request }): Promise<ActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'create') {
      const seriesId = required(form, 'seriesId')
      const series = await publicControllerGetSeriesDetail({ id: seriesId })
      if (!isTransferEligibleSeriesStatus(series.data.status)) {
        return { ok: false, intent, errorKey: 'transfers.errors.seriesNotEligible' }
      }
      const proposedType = required(form, 'proposedType') as 'FULL_TRANSFER' | 'PARTIAL_TRANSFER'
      const percentage = String(form.get('proposedPercentage') ?? '').trim()
      await transferControllerCreateTransferRequest({
        seriesId,
        planDescription: required(form, 'planDescription'),
        proposedType,
        proposedPercentage: proposedType === 'PARTIAL_TRANSFER' && percentage ? Number(percentage) : undefined
      })
    } else if (intent === 'accept') {
      await transferControllerMangakaAcceptTransfer({ id: required(form, 'requestId') })
    } else if (intent === 'reject') {
      await transferControllerMangakaRejectTransfer({ id: required(form, 'requestId') })
    } else if (intent === 'sendOtp') {
      const me = await usersControllerGetMe()
      await authControllerSendOtp({ email: me.data.email, purpose: 'SIGNING_CONTRACT' })
    } else if (intent === 'sign') {
      const contractId = required(form, 'contractId')
      const [contractResponse, meResponse] = await Promise.all([
        transferControllerGetTransferContractById({ id: contractId }),
        usersControllerGetMe()
      ])
      const contract = contractResponse.data
      const isMangakaA = contract.fromMangakaId === meResponse.data.id
      const isMangakaB = contract.toMangakaId === meResponse.data.id
      if (
        (!isMangakaA && !isMangakaB) ||
        (isMangakaA && contract.status !== 'DRAFT') ||
        (isMangakaB && contract.status !== 'A_SIGNED')
      ) {
        return { ok: false, intent, errorKey: 'transfers.errors.notYourTurn' }
      }
      await transferControllerSignTransferContract({ id: contractId }, { otpCode: required(form, 'otpCode') })
    } else {
      return { ok: false, intent, errorKey: 'transfers.errors.invalidAction' }
    }
    return { ok: true, intent }
  } catch (error: unknown) {
    return { ok: false, intent, errorKey: transferErrorKey(extractApiErrorCode(error)) }
  }
}

function required(form: FormData, key: string): string {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

function transferErrorKey(code: string | null | undefined): string {
  const byCode: Record<string, string> = {
    'Error.TransferRequesterAlreadyOwnsSeries': 'transfers.errors.alreadyOwner',
    'Error.TransferRequestingMangakaInactive': 'transfers.errors.inactive',
    'Error.InvalidTransferProposal': 'transfers.errors.invalidProposal',
    'Error.RequestNotInNegotiatingStage': 'transfers.errors.notNegotiating',
    'Error.TransferAccessDenied': 'transfers.errors.accessDenied',
    'Error.TransferAlreadySigned': 'transfers.errors.alreadySigned',
    'Error.TransferSignerNotFound': 'transfers.errors.signerNotFound',
    'Error.TransferContractNotFound': 'transfers.errors.contractNotFound',
    'Error.TransferRequestNotFound': 'transfers.errors.requestNotFound',
    'Error.NoActiveContractForSeries': 'transfers.errors.noActiveContract',
    'Error.ActiveTransferRequestAlreadyExists': 'transfers.errors.activeRequestExists',
    'Error.TransferContractApprovalDecisionRequired': 'transfers.errors.awaitingContractDecision'
  }
  return (code && byCode[code]) || 'transfers.errors.generic'
}

export default function MangakaTransfersRoute({
  loaderData
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  const { t } = useTranslation('mangaka')
  const [createOpen, setCreateOpen] = useState(false)
  const [dismissedContractId, setDismissedContractId] = useState('')
  const active = loaderData.requests.filter((item) => !TERMINAL_STATUSES.has(item.status))
  const history = loaderData.requests.filter((item) => TERMINAL_STATUSES.has(item.status))
  const standaloneSignOpen = Boolean(
    loaderData.focusContractId && loaderData.focusContract && loaderData.focusContractId !== dismissedContractId
  )

  return (
    <div className='space-y-6 pb-12'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
            <ArrowRightLeft className='size-4' aria-hidden='true' /> {t('transfers.eyebrow')}
          </p>
          <h1 className='mt-2 text-3xl font-bold text-foreground'>{t('transfers.title')}</h1>
          <p className='mt-2 max-w-2xl text-sm text-muted-foreground'>{t('transfers.description')}</p>
        </div>
        <button
          type='button'
          onClick={() => setCreateOpen(true)}
          className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'
        >
          <Plus className='size-4' aria-hidden='true' /> {t('transfers.actions.create')}
        </button>
      </header>

      {loaderData.focusRequestLoadFailed && (
        <p
          className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'
          role='alert'
        >
          {t('transfers.errors.requestNotFound')}
        </p>
      )}

      {loaderData.focusContractId && (
        <section className='rounded-xl border border-primary/30 bg-primary/10 p-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h2 className='font-bold text-foreground'>{t('transfers.sign.notificationTitle')}</h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                {loaderData.focusContractLoadFailed
                  ? t('transfers.sign.contractUnavailable')
                  : loaderData.signaturesLoadFailed
                    ? t('transfers.sign.signaturesUnavailable')
                    : t('transfers.sign.reviewBeforeSigning')}
              </p>
            </div>
            <button
              type='button'
              onClick={() => setDismissedContractId('')}
              disabled={!loaderData.focusContract || loaderData.signaturesLoadFailed}
              className='inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50'
            >
              <ShieldCheck className='size-4' aria-hidden='true' /> {t('transfers.actions.sign')}
            </button>
          </div>
        </section>
      )}

      {createOpen && <CreateRequestDialog series={loaderData.series} onClose={() => setCreateOpen(false)} />}

      <RequestSection
        title={t('transfers.sections.active')}
        items={active}
        currentUserId={loaderData.currentUserId}
        focusRequestId={loaderData.focusRequestId}
      />
      <RequestSection
        title={t('transfers.sections.history')}
        items={history}
        currentUserId={loaderData.currentUserId}
        focusRequestId={loaderData.focusRequestId}
      />

      {standaloneSignOpen && loaderData.focusContract && (
        <SignDialog
          contract={loaderData.focusContract}
          signatures={loaderData.contractSignatures}
          currentUserId={loaderData.currentUserId}
          onClose={() => setDismissedContractId(loaderData.focusContractId)}
        />
      )}
    </div>
  )
}

function RequestSection({
  title,
  items,
  currentUserId,
  focusRequestId
}: {
  title: string
  items: TransferRequestResDtoOutput[]
  currentUserId: string
  focusRequestId: string
}) {
  const { t } = useTranslation('mangaka')
  return (
    <section className='space-y-3'>
      <h2 className='text-lg font-bold text-foreground'>
        {title} <span className='text-sm font-normal text-muted-foreground'>({items.length})</span>
      </h2>
      <div className='grid gap-4'>
        {items.map((item) => (
          <TransferRequestCard
            key={item.id}
            item={item}
            currentUserId={currentUserId}
            focused={item.id === focusRequestId}
          />
        ))}
        {!items.length && (
          <p className='rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground'>
            {t('transfers.sections.empty')}
          </p>
        )}
      </div>
    </section>
  )
}

function TransferRequestCard({
  item,
  currentUserId,
  focused
}: {
  item: TransferRequestResDtoOutput
  currentUserId: string
  focused: boolean
}) {
  const { t } = useTranslation('mangaka')
  const fetcher = useFetcher<ActionResult>()
  const isOriginalMangaka = item.originalMangakaId === currentUserId
  const isRequestingMangaka = item.requestingMangakaId === currentUserId
  const canRespond = isOriginalMangaka && item.status === 'NEGOTIATING'
  const [responseIntent, setResponseIntent] = useState<'accept' | 'reject' | null>(null)

  return (
    <article
      className={cn(
        'rounded-xl border bg-card p-5 shadow-sm',
        focused ? 'border-primary ring-2 ring-ring/30' : 'border-border'
      )}
    >
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='font-bold text-foreground'>{item.series?.title ?? t('transfers.card.unknownSeries')}</h3>
          <p className='mt-1 text-xs text-muted-foreground'>
            {t(`transfers.types.${item.proposedType}`)} ·{' '}
            {t('transfers.card.requester', {
              name: item.requestingMangaka?.displayName ?? t('transfers.card.unknownMangaka')
            })}
          </p>
        </div>
        <span className='rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground'>
          {t(`transfers.status.${item.status}`, { defaultValue: item.status })}
        </span>
      </div>
      <p className='mt-3 text-sm text-muted-foreground'>{item.planDescription}</p>
      <p className='mt-3 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground'>
        {t(
          item.status === 'COMPLETED'
            ? 'transfers.card.ownershipCompleted'
            : TERMINAL_STATUSES.has(item.status)
              ? 'transfers.card.ownershipUnchanged'
              : 'transfers.card.ownershipPending'
        )}
      </p>
      {item.proposedPercentage != null && (
        <p className='mt-2 text-sm text-foreground'>
          {t('transfers.card.percentage', { value: item.proposedPercentage })}
        </p>
      )}

      {item.transferContractId && (
        <div className='mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3'>
          <p className='text-xs font-semibold leading-5 text-muted-foreground'>
            {t('transfers.card.contractReadyHint')}
          </p>
          <Link
            to={`?requestId=${encodeURIComponent(item.id)}&contractId=${encodeURIComponent(item.transferContractId)}`}
            className='mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
          >
            <FileCheck2 className='size-4' aria-hidden='true' />
            {t('transfers.actions.reviewContract')}
          </Link>
        </div>
      )}
      {isRequestingMangaka && item.status === 'AWAITING_REPLACEMENT_SIGNATURES' && (
        <div className='mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3'>
          <p className='text-xs font-semibold leading-5 text-muted-foreground'>
            {t('transfers.card.replacementContractHint')}
          </p>
          <Link
            to={
              item.replacementContractId
                ? `/dashboard/mangaka/contracts/${encodeURIComponent(item.replacementContractId)}`
                : '/dashboard/mangaka/contracts'
            }
            className='mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
          >
            <FileCheck2 className='size-4' aria-hidden='true' />
            {t('transfers.actions.openContracts')}
          </Link>
        </div>
      )}

      {canRespond && (
        <div className='mt-4 flex flex-wrap gap-2 border-t border-border pt-4'>
          <button
            type='button'
            onClick={() => setResponseIntent('accept')}
            disabled={fetcher.state !== 'idle'}
            className='h-9 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50'
          >
            {t('transfers.actions.accept')}
          </button>
          <button
            type='button'
            onClick={() => setResponseIntent('reject')}
            disabled={fetcher.state !== 'idle'}
            className='h-9 rounded-md border border-destructive px-3 text-sm font-bold text-destructive disabled:opacity-50'
          >
            {t('transfers.actions.reject')}
          </button>
        </div>
      )}
      {responseIntent && (
        <Dialog
          open
          onClose={() => setResponseIntent(null)}
          titleId={`confirm-transfer-${responseIntent}-${item.id}`}
          title={t(`transfers.confirm.${responseIntent}Title`)}
          description={t(`transfers.confirm.${responseIntent}Description`)}
          size='sm'
          compact
        >
          <fetcher.Form method='post' className='grid gap-3' onSubmit={() => setResponseIntent(null)}>
            <input type='hidden' name='requestId' value={item.id} />
            <div className='flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setResponseIntent(null)}
                className='h-10 rounded-md border border-border px-4 text-sm font-bold'
              >
                {t('transfers.actions.cancel')}
              </button>
              <button
                name='intent'
                value={responseIntent}
                disabled={fetcher.state !== 'idle'}
                className={cn(
                  'h-10 rounded-md px-4 text-sm font-bold disabled:opacity-50',
                  responseIntent === 'accept'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-destructive text-destructive-foreground'
                )}
              >
                {t(`transfers.confirm.${responseIntent}Action`)}
              </button>
            </div>
          </fetcher.Form>
        </Dialog>
      )}
      {fetcher.data && <ActionFeedback result={fetcher.data} successKey='transfers.success.requestUpdated' />}
    </article>
  )
}

function CreateRequestDialog({
  series,
  onClose
}: {
  series: PublicSeriesListResDtoOutputItemsItem[]
  onClose: () => void
}) {
  const { t } = useTranslation('mangaka')
  const fetcher = useFetcher<ActionResult>()
  const [type, setType] = useState<'FULL_TRANSFER' | 'PARTIAL_TRANSFER'>('FULL_TRANSFER')

  useEffect(() => {
    if (fetcher.data?.ok && fetcher.data.intent === 'create') onClose()
  }, [fetcher.data, onClose])

  return (
    <Dialog
      open
      onClose={onClose}
      titleId='create-transfer-request'
      title={t('transfers.create.title')}
      description={t('transfers.create.description')}
      size='lg'
    >
      <fetcher.Form method='post' className='grid gap-3'>
        <label className='grid gap-1 text-sm font-semibold text-foreground'>
          {t('transfers.create.series')}
          <select name='seriesId' required defaultValue='' className={inputClass}>
            <option value='' disabled>
              {t('transfers.create.seriesPlaceholder')}
            </option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          {!series.length && (
            <span className='text-xs font-normal leading-5 text-muted-foreground'>
              {t('transfers.create.noEligibleSeries')}
            </span>
          )}
        </label>
        <label className='grid gap-1 text-sm font-semibold text-foreground'>
          {t('transfers.create.type')}
          <select
            name='proposedType'
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
            className={inputClass}
          >
            <option value='FULL_TRANSFER'>{t('transfers.types.FULL_TRANSFER')}</option>
            <option value='PARTIAL_TRANSFER'>{t('transfers.types.PARTIAL_TRANSFER')}</option>
          </select>
        </label>
        {type === 'PARTIAL_TRANSFER' && (
          <label className='grid gap-1 text-sm font-semibold text-foreground'>
            {t('transfers.create.percentage')}
            <input name='proposedPercentage' type='number' min={1} max={99} required className={inputClass} />
          </label>
        )}
        <label className='grid gap-1 text-sm font-semibold text-foreground'>
          {t('transfers.create.plan')}
          <textarea
            name='planDescription'
            required
            minLength={1}
            rows={5}
            className='w-full rounded-md border border-input bg-background p-3 text-sm text-foreground'
            placeholder={t('transfers.create.planPlaceholder')}
          />
        </label>
        <div className='flex justify-end gap-2'>
          <button
            type='button'
            onClick={onClose}
            className='h-10 rounded-md border border-border px-4 text-sm font-bold'
          >
            {t('transfers.actions.cancel')}
          </button>
          <button
            name='intent'
            value='create'
            disabled={fetcher.state !== 'idle' || !series.length}
            className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
          >
            {fetcher.state !== 'idle' && <Loader2 className='mr-2 inline size-4 animate-spin' aria-hidden='true' />}
            {t('transfers.actions.submit')}
          </button>
        </div>
      </fetcher.Form>
      {fetcher.data && !fetcher.data.ok && (
        <ActionFeedback result={fetcher.data} successKey='transfers.success.created' />
      )}
    </Dialog>
  )
}

function SignDialog({
  contract,
  signatures,
  currentUserId,
  onClose
}: {
  contract: TransferContractResDtoOutput
  signatures: TransferSignatureListResDtoOutputSignaturesItem[]
  currentUserId: string
  onClose: () => void
}) {
  const { t, i18n } = useTranslation('mangaka')
  const fetcher = useFetcher<ActionResult>()
  const { isCoolingDown, remainingSeconds, start } = useOtpCooldown()
  const isMangakaA = contract.fromMangakaId === currentUserId
  const isMangakaB = contract.toMangakaId === currentUserId
  const isMyTurn = (isMangakaA && contract.status === 'DRAFT') || (isMangakaB && contract.status === 'A_SIGNED')
  const ownershipEntries = Object.entries(contract.newOwnershipSplit ?? {})

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok && fetcher.data.intent === 'sendOtp') start()
  }, [fetcher.data, fetcher.state, start])

  return (
    <Dialog
      open
      onClose={onClose}
      titleId='sign-transfer-contract'
      title={t('transfers.sign.title')}
      description={t('transfers.sign.reviewDescription')}
      size='lg'
    >
      <div className='space-y-5'>
        <div className='rounded-xl border border-info/30 bg-info/5 p-4'>
          <div className='flex items-start gap-3'>
            <ShieldCheck className='mt-0.5 size-5 shrink-0 text-info' aria-hidden='true' />
            <div>
              <p className='text-sm font-bold text-foreground'>{t('transfers.sign.legalNoticeTitle')}</p>
              <p className='mt-1 text-xs leading-5 text-muted-foreground'>{t('transfers.sign.legalNotice')}</p>
            </div>
          </div>
        </div>

        <div className='grid gap-3 sm:grid-cols-2'>
          <ContractFact label={t('transfers.sign.series')} value={contract.series?.title ?? '—'} />
          <ContractFact
            label={t('transfers.sign.amount')}
            value={
              contract.transferAmount == null
                ? '—'
                : new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'JPY' }).format(
                    contract.transferAmount
                  )
            }
          />
          <ContractFact label={t('transfers.sign.from')} value={contract.fromMangaka?.displayName ?? '—'} />
          <ContractFact label={t('transfers.sign.to')} value={contract.toMangaka?.displayName ?? '—'} />
          <ContractFact label={t('transfers.sign.type')} value={contract.transferType ?? '—'} />
          <ContractFact
            label={t('transfers.sign.status')}
            value={t(`transfers.contractStatus.${contract.status}`, { defaultValue: contract.status })}
          />
        </div>

        <section className='rounded-xl border border-border bg-muted/30 p-4'>
          <h3 className='flex items-center gap-2 text-sm font-bold text-foreground'>
            <UsersRound className='size-4 text-primary' aria-hidden='true' />
            {t('transfers.sign.ownershipTitle')}
          </h3>
          <div className='mt-3 grid gap-2 sm:grid-cols-3'>
            {ownershipEntries.map(([party, percentage]) => (
              <div key={party} className='rounded-lg border border-border bg-card p-3'>
                <p className='text-[10px] font-bold uppercase tracking-wide text-muted-foreground'>{party}</p>
                <p className='mt-1 text-lg font-extrabold text-foreground'>{percentage}%</p>
              </div>
            ))}
            {!ownershipEntries.length && <p className='text-xs text-muted-foreground'>{t('transfers.sign.noSplit')}</p>}
          </div>
        </section>

        <section className='rounded-xl border border-border p-4'>
          <h3 className='text-sm font-bold text-foreground'>{t('transfers.sign.progressTitle')}</h3>
          <div className='mt-3 grid gap-2 sm:grid-cols-3'>
            {(['MANGAKA_A', 'MANGAKA_B', 'BOARD'] as const).map((role) => {
              const signature = signatures.find((item) => item.role === role)
              return (
                <div key={role} className='flex items-start gap-2 rounded-lg bg-muted/40 p-3'>
                  <CheckCircle2
                    className={cn('mt-0.5 size-4 shrink-0', signature ? 'text-success' : 'text-muted-foreground')}
                  />
                  <div>
                    <p className='text-xs font-bold text-foreground'>{t(`transfers.sign.roles.${role}`)}</p>
                    <p className='mt-1 text-[11px] text-muted-foreground'>
                      {signature
                        ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
                            new Date(signature.signedAt)
                          )
                        : t('transfers.sign.pending')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {isMangakaA && contract.status === 'DRAFT' && (
          <p className='rounded-lg border border-info/30 bg-info/5 p-3 text-xs font-semibold leading-5 text-info'>
            {t('transfers.sign.boardApprovalRequired')}
          </p>
        )}

        {!isMyTurn && (
          <p className='rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs font-semibold text-warning-foreground'>
            {isMangakaA || isMangakaB ? t('transfers.sign.waitYourTurn') : t('transfers.sign.notSigner')}
          </p>
        )}

        <fetcher.Form method='post' className='grid gap-3 rounded-xl border border-border p-4'>
          <input type='hidden' name='contractId' value={contract.id} />
          <button
            name='intent'
            value='sendOtp'
            formNoValidate
            disabled={!isMyTurn || fetcher.state !== 'idle' || isCoolingDown}
            className='h-10 rounded-md border border-border px-3 text-sm font-bold text-foreground disabled:opacity-50'
          >
            {isCoolingDown
              ? `${t('transfers.actions.sendOtp')} (${remainingSeconds}s)`
              : t('transfers.actions.sendOtp')}
          </button>
          <label className='grid gap-1 text-sm font-semibold text-foreground'>
            {t('transfers.sign.otp')}
            <input
              name='otpCode'
              required
              inputMode='numeric'
              pattern='[0-9]{6}'
              minLength={6}
              maxLength={6}
              className={inputClass}
              placeholder={t('transfers.sign.otpPlaceholder')}
            />
          </label>
          <div className='flex justify-end gap-2'>
            <button
              type='button'
              onClick={onClose}
              className='h-10 rounded-md border border-border px-4 text-sm font-bold'
            >
              {t('transfers.actions.cancel')}
            </button>
            <button
              name='intent'
              value='sign'
              disabled={!isMyTurn || fetcher.state !== 'idle'}
              className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
            >
              {t('transfers.actions.confirmSign')}
            </button>
          </div>
        </fetcher.Form>
        {fetcher.data && <ActionFeedback result={fetcher.data} successKey='transfers.success.signed' />}
      </div>
    </Dialog>
  )
}

function ContractFact({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl border border-border bg-card p-3'>
      <p className='text-[10px] font-bold uppercase tracking-wide text-muted-foreground'>{label}</p>
      <p className='mt-1 break-words text-sm font-semibold text-foreground'>{value}</p>
    </div>
  )
}

function ActionFeedback({ result, successKey }: { result: ActionResult; successKey: string }) {
  const { t } = useTranslation('mangaka')
  return (
    <p
      className={cn('mt-3 text-sm font-semibold', result.ok ? 'text-success' : 'text-destructive')}
      role={result.ok ? 'status' : 'alert'}
    >
      {result.ok ? t(successKey) : t(result.errorKey ?? 'transfers.errors.generic')}
    </p>
  )
}
