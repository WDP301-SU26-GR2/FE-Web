import { GitPullRequestArrow, Info, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Form, Link } from 'react-router'
import type {
  TransferContractResDtoOutput,
  TransferRequestListResDtoOutputDataItem,
  TransferRequestResDtoOutput,
  TransferSignatureListResDtoOutputSignaturesItem
} from '~/api/model/transfer'
import { MoneyInWords } from '~/shared/components/money-in-words'
import { TransferContractSummary } from '~/shared/components/transfer-contract-summary'
import { Pagination } from '~/shared/components'
import { CONTRACT_FIELD_LIMITS } from '../contracts/contract-flow'
import {
  OperationAction,
  OperationFeedback,
  OperationDialogPanel,
  OperationsLayout,
  operationDialogButton,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

const EDITOR_LIST_PAGE_SIZE = 8

export function EditorTransfersPage({
  requests,
  request,
  contract,
  requestId,
  contractId,
  status,
  signatures,
  hasError
}: {
  requests: TransferRequestListResDtoOutputDataItem[]
  request: TransferRequestResDtoOutput | null
  contract: TransferContractResDtoOutput | null
  requestId: string
  contractId: string
  status: string
  signatures: TransferSignatureListResDtoOutputSignaturesItem[]
  hasError: boolean
}) {
  const { t, i18n } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  const displayRequest = request as TransferRequestWithRelations | null
  const [transferType, setTransferType] = useState<'FULL_TRANSFER' | 'PARTIAL_TRANSFER'>('FULL_TRANSFER')
  const [transferAmount, setTransferAmount] = useState<number | null>(null)
  const isRevenueShare = request?.originalContractType === 'REVENUE_SHARE'
  const canStartNegotiation = Boolean(request && isRevenueShare && request.status === 'UNDER_REVIEW')
  // ACCEPTED is the explicit proof that Mangaka A consented. UNDER_REVIEW is only the
  // earlier Board-screened state and must never unlock contract creation.
  const canCreateContract = Boolean(
    request && isRevenueShare && request.status === 'ACCEPTED' && !request.transferContractId && !contract
  )
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(requests.length / EDITOR_LIST_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const from = requests.length === 0 ? 0 : (currentPage - 1) * EDITOR_LIST_PAGE_SIZE + 1
  const to = Math.min(currentPage * EDITOR_LIST_PAGE_SIZE, requests.length)
  const paginatedRequests = requests.slice(from > 0 ? from - 1 : 0, to)
  return (
    <OperationsLayout
      titleKey='operations.transfers'
      descriptionKey='operations.descriptions.transfers'
      hasError={hasError}
    >
      <Form
        method='get'
        replace
        preventScrollReset
        className='grid gap-2 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'
      >
        <select name='status' defaultValue={status} className={operationInput}>
          <option value=''>{t('operations.allTransferStatuses')}</option>
          {[
            'SUBMITTED',
            'UNDER_REVIEW',
            'NEGOTIATING',
            'ACCEPTED',
            'AWAITING_REPLACEMENT_SIGNATURES',
            'AWAITING_TRANSFER_SIGNATURES',
            'COMPLETED',
            'REJECTED_BY_BOARD',
            'REJECTED_BY_ORIGINAL_MANGAKA',
            'REJECTED',
            'CANCELLED'
          ].map((value) => (
            <option key={value} value={value}>
              {t(`operations.transferStatuses.${value}`)}
            </option>
          ))}
        </select>
        <button type='submit' className={`${operationDialogButton} bg-primary text-primary-foreground`}>
          {t('actions.openTransferRequest')}
        </button>
        <p className='text-xs leading-5 text-muted-foreground sm:col-span-3'>{t('operations.transferRequestIdHint')}</p>
      </Form>
      <section className='rounded-xl border border-border bg-card p-4 shadow-sm'>
        <h2 className='text-sm font-bold text-foreground'>{t('operations.assignedTransferRequests')}</h2>
        <div className='mt-3 grid gap-2'>
          {paginatedRequests.map((item) => (
            <Link
              key={item.id}
              to={`?requestId=${encodeURIComponent(item.id)}${status ? `&status=${encodeURIComponent(status)}` : ''}`}
              preventScrollReset
              className='flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-xs hover:border-primary'
            >
              <span className='font-bold'>{item.series?.title ?? item.seriesId}</span>
              <span className='text-primary'>{t(`operations.transferStatuses.${item.status}`)}</span>
            </Link>
          ))}
          {requests.length > 0 && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              setPage={setPage}
              from={from}
              to={to}
              total={requests.length}
              tKeyPrefix='pagination'
              t={t}
            />
          )}
          {!requests.length && <p className='text-xs text-muted-foreground'>{t('operations.noAssignedTransfers')}</p>}
        </div>
      </section>
      {request && (
        <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <div className='rounded-lg border border-border p-4 text-xs'>
            <div className='flex flex-wrap justify-between gap-2'>
              <strong>{displayRequest?.series?.title ?? t('operations.unknownSeries')}</strong>
              <span className='font-bold text-primary'>{t(`operations.transferStatuses.${request.status}`)}</span>
            </div>
            <p className='mt-2 text-muted-foreground'>{request.planDescription}</p>
          </div>
        </section>
      )}
      {request?.status === 'SUBMITTED' && (
        <section className='rounded-xl border border-warning/30 bg-warning/10 p-4 text-xs leading-5'>
          <p className='text-warning-foreground'>{t('operations.transferAwaitingBoardDecision')}</p>
          <Link className='mt-2 inline-flex font-bold text-primary underline' to='/dashboard/editor/board/sessions'>
            {t('actions.openBoardWorkflow')}
          </Link>
        </section>
      )}
      {contract && (
        <TransferContractSummary
          contract={contract}
          locale={i18n.language}
          labels={{
            title: t('operations.transferContractSummary.title'),
            description: t('operations.transferContractSummary.editorDescription'),
            status: t('operations.transferContractSummary.status'),
            statusValue: t(`operations.transferContractStatuses.${contract.status}`),
            type: t('operations.transferContractSummary.type'),
            typeValue: contract.transferType
              ? t(`operations.transferTypes.${contract.transferType}`)
              : t('common.notAvailable'),
            amount: t('operations.transferContractSummary.amount'),
            parties: t('operations.transferContractSummary.parties'),
            ownership: t('operations.transferContractSummary.ownership'),
            publisher: t('operations.publisherShare'),
            originalMangaka: t('operations.originalMangakaShare'),
            newMangaka: t('operations.newMangakaShare'),
            coOwnerRequired: t('operations.transferContractSummary.coOwnerRequired'),
            coOwnerNotRequired: t('operations.transferContractSummary.coOwnerNotRequired'),
            unknown: t('common.notAvailable')
          }}
        />
      )}
      {contractId && (
        <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <h2 className='font-bold text-foreground'>{t('operations.transferSignatures')}</h2>
          <div className='mt-3 grid gap-2'>
            {signatures.map((signature) => (
              <div key={signature.id} className='flex justify-between rounded-md bg-muted p-3 text-xs'>
                <strong>
                  {t(`operations.transferSignatureRoles.${signature.role}`, {
                    defaultValue: t('common.notAvailable')
                  })}
                </strong>
                <span>{new Date(signature.signedAt).toLocaleString(i18n.language)}</span>
              </div>
            ))}
            {!signatures.length && <p className='text-xs text-muted-foreground'>{t('operations.noSignatures')}</p>}
          </div>
        </section>
      )}
      {!request && !contract && (
        <p className='rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground'>
          {t('operations.transferLoadHint')}
        </p>
      )}
      {request?.status === 'NEGOTIATING' && (
        <p className='rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground'>
          {t('operations.transferNegotiatingHint')}
        </p>
      )}
      {canStartNegotiation && (
        <OperationDialogPanel icon={GitPullRequestArrow} title={t('operations.startTransferSection')}>
          <fetcher.Form method='post' className='grid gap-3'>
            <input type='hidden' name='transferRequestId' value={request!.id} />
            <p className='rounded-lg bg-muted p-3 text-xs text-muted-foreground'>{t('operations.transferStartHint')}</p>
            <OperationAction intent='startTransfer' label={t('actions.startNegotiation')} />
          </fetcher.Form>
        </OperationDialogPanel>
      )}
      {canCreateContract && (
        <OperationDialogPanel icon={ShieldCheck} title={t('operations.createTransferSection')}>
          <fetcher.Form method='post' className='grid gap-3'>
            <input type='hidden' name='transferRequestId' value={request!.id} />
            <div className='flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground'>
              <Info className='mt-0.5 size-4 shrink-0' />
              {t('operations.transferAcceptedHint')}
            </div>
            <label className='grid min-w-0 gap-1.5'>
              <input
                name='transferAmount'
                type='number'
                min={CONTRACT_FIELD_LIMITS.moneyMinimum}
                max={CONTRACT_FIELD_LIMITS.moneyMaximum}
                step={1}
                required
                className={operationInput}
                placeholder={t('operations.transferAmount')}
                onChange={(event) => setTransferAmount(event.target.value ? Number(event.target.value) : null)}
              />
              <MoneyInWords amount={transferAmount} locale={i18n.language} />
            </label>
            <select
              name='transferType'
              value={transferType}
              onChange={(event) => setTransferType(event.target.value as typeof transferType)}
              className={operationInput}
            >
              <option value='FULL_TRANSFER'>{t('operations.fullTransfer')}</option>
              <option value='PARTIAL_TRANSFER'>{t('operations.partialTransfer')}</option>
            </select>
            <fieldset key={transferType} className='grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3'>
              <legend className='px-1 text-xs font-bold text-muted-foreground'>{t('operations.ownershipSplit')}</legend>
              <Share name='publisherShare' label={t('operations.publisherShare')} value={50} />
              <Share
                name='originalMangakaShare'
                label={t('operations.originalMangakaShare')}
                value={transferType === 'FULL_TRANSFER' ? 0 : 25}
              />
              <Share
                name='newMangakaShare'
                label={t('operations.newMangakaShare')}
                value={transferType === 'FULL_TRANSFER' ? 50 : 25}
              />
              <p className='text-xs text-muted-foreground sm:col-span-3'>{t('operations.ownershipHint')}</p>
            </fieldset>
            <p className='rounded-lg bg-muted p-3 text-xs text-muted-foreground'>
              {t(
                transferType === 'PARTIAL_TRANSFER' ? 'operations.partialTransferHint' : 'operations.fullTransferHint'
              )}
            </p>
            <OperationAction intent='createTransferContract' label={t('actions.createTransferContract')} />
          </fetcher.Form>
          <OperationFeedback data={fetcher.data} />
          {fetcher.data?.ok && fetcher.data.transferContractId && (
            <div className='mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs'>
              <strong>{t('operations.transferContractCreated')}</strong>
              <Link
                className='mt-2 inline-flex font-bold text-primary underline'
                to={`/dashboard/editor/operations/transfers?requestId=${encodeURIComponent(requestId)}&contractId=${encodeURIComponent(fetcher.data.transferContractId)}`}
              >
                {t('operations.viewSignatureProgress')}
              </Link>
            </div>
          )}
        </OperationDialogPanel>
      )}
    </OperationsLayout>
  )
}

type TransferRequestWithRelations = TransferRequestResDtoOutput & {
  series?: { id: string; title: string } | null
  requestingMangaka?: { id: string; displayName: string; avatar?: string | null } | null
  originalMangaka?: { id: string; displayName: string; avatar?: string | null } | null
}

function Share({ name, label, value }: { name: string; label: string; value: number }) {
  return (
    <label className='grid min-w-0 grid-rows-[2.5rem_auto] gap-1 text-xs text-muted-foreground'>
      <span className='flex min-h-10 items-end leading-5'>{label}</span>
      <input
        name={name}
        type='number'
        min={0}
        max={100}
        required
        defaultValue={value}
        className={operationInput}
      />
    </label>
  )
}
