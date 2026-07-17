import { useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type {
  AmendmentResDtoOutput,
  ContractResDtoOutput,
  ContractStatusProgressResDtoOutput
} from '~/api/model/contracts'
import { boardInput, BoardFeedback, BoardHeader, BoardPanel, StatusBadge } from '../components/board-ui'
import type { BoardActionResult } from '../types'

export function BoardContractDetailPage({
  contract,
  progress,
  amendments
}: {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
  amendments: AmendmentResDtoOutput[]
}) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader
        title={`${t('contracts.detail')} ${contract.id.slice(-6)}`}
        description={`${contract.contractType} · ${contract.seriesId}`}
      />
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
      </BoardPanel>
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
            {contract.status === 'MANGAKA_SIGNED' && (
              <>
                <input
                  name='otpCode'
                  className={`${boardInput} max-w-56`}
                  minLength={6}
                  maxLength={6}
                  placeholder={t('contracts.otp')}
                  required
                />
                <button
                  name='intent'
                  value='sign'
                  className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'
                >
                  {t('contracts.sign')}
                </button>
              </>
            )}
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
  const fetcher = useFetcher<BoardActionResult>()
  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex justify-between gap-3'>
        <strong>{amendment.reason ?? t('contracts.amendment')}</strong>
        <StatusBadge value={amendment.status} />
      </div>
      {amendment.status === 'PENDING_SIGNATURES' && (
        <fetcher.Form method='post' className='mt-3 flex flex-wrap gap-2'>
          <input type='hidden' name='contractId' value={contractId} />
          <input type='hidden' name='amendmentId' value={amendment.id} />
          <input
            className={`${boardInput} max-w-48`}
            name='otpCode'
            minLength={6}
            maxLength={6}
            placeholder={t('contracts.otp')}
            required
          />
          <button
            name='intent'
            value='signAmendment'
            className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
          >
            {t('contracts.signAmendment')}
          </button>
        </fetcher.Form>
      )}
      <BoardFeedback data={fetcher.data} />
    </article>
  )
}
