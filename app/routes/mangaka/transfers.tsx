import { useEffect, useState } from 'react'
import { ArrowRightLeft, Loader2, Plus, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'

import type { PublicSeriesListResDtoOutputItemsItem } from '~/api/model/public'
import type { TransferRequestResDtoOutput, TransferSignatureListResDtoOutputSignaturesItem } from '~/api/model/transfer'
import { authControllerSendOtp } from '~/api/operations/auth/auth'
import { publicControllerListSeries } from '~/api/operations/public/public'
import { loadPublicSeriesCatalog } from '~/features/mangaka'
import {
  transferControllerCreateTransferRequest,
  transferControllerGetTransferRequestById,
  transferControllerGetTransferRequestsByMangaka,
  transferControllerGetSignatures,
  transferControllerMangakaAcceptTransfer,
  transferControllerMangakaRejectTransfer,
  transferControllerSignTransferContract
} from '~/api/operations/transfer/transfer'
import { usersControllerGetMe } from '~/api/operations/users/users'
import { extractApiErrorCode } from '~/shared/lib/api/extract-api-error'
import { cn } from '~/shared/lib/cn'
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

  const [requestsResponse, publicSeries, meResponse] = await Promise.all([
    transferControllerGetTransferRequestsByMangaka(),
    loadPublicSeriesCatalog(publicControllerListSeries),
    usersControllerGetMe()
  ])

  const requests = await Promise.all(
    (requestsResponse.data?.data ?? []).map(async (requestItem) => {
      const detail = await transferControllerGetTransferRequestById({ id: requestItem.id })
      return detail.data
    })
  )

  let focusRequestLoadFailed = false
  if (focusRequestId && !requests.some((item) => item.id === focusRequestId)) {
    try {
      const incoming = await transferControllerGetTransferRequestById({ id: focusRequestId })
      requests.unshift(incoming.data)
    } catch {
      focusRequestLoadFailed = true
    }
  }

  let contractSignatures: TransferSignatureListResDtoOutputSignaturesItem[] = []
  let signaturesLoadFailed = false
  if (focusContractId) {
    try {
      const response = await transferControllerGetSignatures({ id: focusContractId })
      contractSignatures = response.data.signatures
    } catch {
      signaturesLoadFailed = true
    }
  }

  return {
    requests,
    series: publicSeries.filter((item) => ['SERIALIZED', 'HIATUS', 'COMPLETING', 'CANCELLING'].includes(item.status)),
    currentUserId: meResponse.data.id,
    focusRequestId,
    focusRequestLoadFailed,
    focusContractId,
    contractSignatures,
    signaturesLoadFailed
  }
}

export async function clientAction({ request }: { request: Request }): Promise<ActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'create') {
      const proposedType = required(form, 'proposedType') as 'FULL_TRANSFER' | 'PARTIAL_TRANSFER'
      const percentage = String(form.get('proposedPercentage') ?? '').trim()
      await transferControllerCreateTransferRequest({
        seriesId: required(form, 'seriesId'),
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
      await transferControllerSignTransferContract(
        { id: required(form, 'contractId') },
        { otpCode: required(form, 'otpCode') }
      )
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
    'Error.NoActiveContractForSeries': 'transfers.errors.noActiveContract'
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
  const [standaloneSignOpen, setStandaloneSignOpen] = useState(Boolean(loaderData.focusContractId))
  const active = loaderData.requests.filter((item) => !TERMINAL_STATUSES.has(item.status))
  const history = loaderData.requests.filter((item) => TERMINAL_STATUSES.has(item.status))

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
                {loaderData.signaturesLoadFailed
                  ? t('transfers.sign.signaturesUnavailable')
                  : t('transfers.sign.signatureCount', { count: loaderData.contractSignatures.length })}
              </p>
            </div>
            <button
              type='button'
              onClick={() => setStandaloneSignOpen(true)}
              className='inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
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

      {standaloneSignOpen && (
        <SignDialog defaultContractId={loaderData.focusContractId} onClose={() => setStandaloneSignOpen(false)} />
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
  const canRespond = isOriginalMangaka && item.status === 'NEGOTIATING'

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
      {item.proposedPercentage != null && (
        <p className='mt-2 text-sm text-foreground'>
          {t('transfers.card.percentage', { value: item.proposedPercentage })}
        </p>
      )}

      {canRespond && (
        <div className='mt-4 flex flex-wrap gap-2 border-t border-border pt-4'>
          {canRespond && (
            <fetcher.Form method='post' className='flex flex-wrap gap-2'>
              <input type='hidden' name='requestId' value={item.id} />
              <button
                name='intent'
                value='accept'
                disabled={fetcher.state !== 'idle'}
                className='h-9 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50'
              >
                {t('transfers.actions.accept')}
              </button>
              <button
                name='intent'
                value='reject'
                disabled={fetcher.state !== 'idle'}
                className='h-9 rounded-md border border-destructive px-3 text-sm font-bold text-destructive disabled:opacity-50'
              >
                {t('transfers.actions.reject')}
              </button>
            </fetcher.Form>
          )}
        </div>
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
            disabled={fetcher.state !== 'idle'}
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

function SignDialog({ defaultContractId, onClose }: { defaultContractId: string; onClose: () => void }) {
  const { t } = useTranslation('mangaka')
  const fetcher = useFetcher<ActionResult>()
  return (
    <Dialog
      open
      onClose={onClose}
      titleId='sign-transfer-contract'
      title={t('transfers.sign.title')}
      description={t('transfers.sign.description')}
      size='sm'
    >
      <fetcher.Form method='post' className='grid gap-3'>
        <label className='grid gap-1 text-sm font-semibold text-foreground'>
          {t('transfers.sign.contractId')}
          <input
            name='contractId'
            required
            defaultValue={defaultContractId}
            readOnly={Boolean(defaultContractId)}
            className={cn(inputClass, defaultContractId && 'bg-muted')}
            placeholder={t('transfers.sign.contractIdPlaceholder')}
          />
        </label>
        <button
          name='intent'
          value='sendOtp'
          formNoValidate
          disabled={fetcher.state !== 'idle'}
          className='h-10 rounded-md border border-border px-3 text-sm font-bold text-foreground disabled:opacity-50'
        >
          {t('transfers.actions.sendOtp')}
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
            disabled={fetcher.state !== 'idle'}
            className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
          >
            {t('transfers.actions.confirmSign')}
          </button>
        </div>
      </fetcher.Form>
      {fetcher.data && <ActionFeedback result={fetcher.data} successKey='transfers.success.signed' />}
    </Dialog>
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
