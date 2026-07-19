import { useEffect, useState } from 'react'
import { useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PenLine } from 'lucide-react'
import type {
  AmendmentResDtoOutput,
  ContractResDtoOutput,
  ContractStatusProgressResDtoOutput,
  ContractVersionResDtoOutput,
  PaymentConditionListResDtoOutputDataItem
} from '~/api/model/contracts'
import { boardInput, BoardFeedback, BoardHeader, BoardPanel, StatusBadge } from '../components/board-ui'
import type { BoardActionResult } from '../types'
import { Dialog } from '~/shared/ui/dialog'

export function BoardContractDetailPage({
  contract,
  progress,
  amendments,
  conditions,
  versions,
  hasSupplementaryDataError = false
}: {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
  amendments: AmendmentResDtoOutput[]
  conditions: PaymentConditionListResDtoOutputDataItem[]
  versions: ContractVersionResDtoOutput[]
  hasSupplementaryDataError?: boolean
}) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  const [signOpen, setSignOpen] = useState(false)
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader
        title={`${t('contracts.detail')} ${contract.id.slice(-6)}`}
        description={`${contract.contractType} · ${contract.series?.title ?? contract.seriesId}`}
      />
      {hasSupplementaryDataError && (
        <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
          {t('contracts.partialLoadError')}
        </p>
      )}
      <BoardPanel title={t('contracts.terms')}>
        <div className='grid gap-4 text-sm sm:grid-cols-3'>
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
            <span className='text-muted-foreground'>{t('contracts.ownership')}</span>
            <p className='mt-1 font-bold'>
              {contract.publisherOwnershipPct ?? 0}% / {contract.mangakaOwnershipPct ?? 0}%
            </p>
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
          <div className='space-y-2'>
            {conditions.map((condition) => (
              <div key={condition.id} className='flex items-center justify-between rounded-lg border border-border p-3 text-sm'>
                <span>{condition.conditionType}</span><StatusBadge value={condition.status} />
              </div>
            ))}
            {!conditions.length && <p className='text-sm text-muted-foreground'>{t('contracts.emptyConditions')}</p>}
          </div>
        </BoardPanel>
        <BoardPanel title={t('contracts.versions')}>
          <div className='space-y-2'>
            {versions.map((version) => (
              <div key={version.id} className='rounded-lg border border-border p-3 text-sm'>
                <strong>v{version.versionNumber}</strong>
                <p className='mt-1 text-xs text-muted-foreground'>{new Date(version.createdAt).toLocaleString()} · {version.note || '—'}</p>
              </div>
            ))}
            {!versions.length && <p className='text-sm text-muted-foreground'>{t('contracts.emptyVersions')}</p>}
          </div>
        </BoardPanel>
      </div>
      <BoardPanel title={t('contracts.actions')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <div className='flex flex-wrap gap-2'>
            {contract.status === 'MANGAKA_APPROVED' && (
              <>
                <button
                  name='intent'
                  value='approve'
                  className='h-9 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
                >
                  {t('contracts.approve')}
                </button>
                <button
                  name='intent'
                  value='changes'
                  className='h-9 rounded-md border border-border px-3 text-sm font-bold'
                >
                  {t('contracts.changes')}
                </button>
              </>
            )}
            <div className='flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4'>
              <div>
              <h3 className='text-sm font-bold text-foreground'>
                {t('contracts.boardSignature')}
              </h3>
              <p className='mt-1 text-xs text-muted-foreground'>
                {contract.status === 'MANGAKA_SIGNED'
                  ? t('contracts.readyToSign')
                  : contract.boardSignedAt
                    ? `${t('contracts.signed')}: ${new Date(contract.boardSignedAt).toLocaleString()}`
                    : t('contracts.waitingMangakaSignature')}
              </p>
              </div>
              {contract.status === 'MANGAKA_SIGNED' && (
                <button
                  type='button'
                  onClick={() => setSignOpen(true)}
                  className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'
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
      {signOpen && <ContractSignDialog onClose={() => setSignOpen(false)} />}
      <BoardPanel title={t('contracts.amendments')}>
        <div className='space-y-3'>
          {amendments.map((item) => (
            <AmendmentRow key={item.id} contractId={contract.id} amendment={item} />
          ))}
          {!amendments.length && <p className='text-sm text-muted-foreground'>{t('contracts.emptyAmendments')}</p>}
        </div>
      </BoardPanel>
    </div>
  )
}

function AmendmentRow({ contractId, amendment }: { contractId: string; amendment: AmendmentResDtoOutput }) {
  const { t } = useTranslation('board')
  const [signOpen, setSignOpen] = useState(false)
  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex justify-between gap-3'>
        <strong>{amendment.reason ?? t('contracts.amendment')}</strong>
        <StatusBadge value={amendment.status} />
      </div>
      {amendment.status === 'PENDING_SIGNATURES' && (
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
        <AmendmentSignDialog
          contractId={contractId}
          amendmentId={amendment.id}
          onClose={() => setSignOpen(false)}
        />
      )}
    </article>
  )
}

function ContractSignDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <Dialog open onClose={onClose} titleId='board-contract-sign-title' title={t('contracts.boardSignature')} size='sm'>
      <fetcher.Form method='post' className='grid gap-3'>
        <p className='text-sm text-muted-foreground'>{t('contracts.otpInstruction')}</p>
        <button type='submit' name='intent' value='sendOtp' formNoValidate className='h-10 rounded-md border border-border px-3 text-sm font-bold'>
          {t('contracts.sendOtp')}
        </button>
        <input className={boardInput} name='otpCode' minLength={6} maxLength={6} placeholder={t('contracts.otp')} required />
        <div className='flex justify-end gap-2'>
          <button type='button' onClick={onClose} className='h-10 rounded-md border border-border px-4 text-sm font-bold'>{t('common.cancel')}</button>
          <button name='intent' value='sign' disabled={fetcher.state !== 'idle'} className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60'>{t('contracts.sign')}</button>
        </div>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </Dialog>
  )
}

function AmendmentSignDialog({ contractId, amendmentId, onClose }: { contractId: string; amendmentId: string; onClose: () => void }) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <Dialog open onClose={onClose} titleId={`board-amendment-sign-${amendmentId}`} title={t('contracts.signAmendment')} size='sm'>
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='contractId' value={contractId} />
        <input type='hidden' name='amendmentId' value={amendmentId} />
        <p className='text-sm text-muted-foreground'>{t('contracts.otpInstruction')}</p>
        <button type='submit' name='intent' value='sendOtp' formNoValidate className='h-10 rounded-md border border-border px-3 text-sm font-bold'>{t('contracts.sendOtp')}</button>
        <input className={boardInput} name='otpCode' minLength={6} maxLength={6} placeholder={t('contracts.otp')} required />
        <div className='flex justify-end gap-2'>
          <button type='button' onClick={onClose} className='h-10 rounded-md border border-border px-4 text-sm font-bold'>{t('common.cancel')}</button>
          <button name='intent' value='signAmendment' disabled={fetcher.state !== 'idle'} className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60'>{t('contracts.signAmendment')}</button>
        </div>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </Dialog>
  )
}
