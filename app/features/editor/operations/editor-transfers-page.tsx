import { GitPullRequestArrow } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TransferRequestResDtoOutput } from '~/api/model/transfer'
import {
  OperationAction,
  OperationFeedback,
  OperationDialogPanel,
  OperationsLayout,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

export function EditorTransfersPage({
  request,
  requestId,
  hasError
}: {
  request: TransferRequestResDtoOutput | null
  requestId: string
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  return (
    <OperationsLayout titleKey='operations.transfers' descriptionKey='operations.descriptions.transfers' hasError={hasError}>
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <form method='get' className='grid gap-3 sm:grid-cols-[1fr_auto]'>
          <input name='requestId' defaultValue={requestId} required className={operationInput} placeholder={t('operations.transferRequestId')} />
          <button className='rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>{t('actions.load')}</button>
        </form>
        {request && (
          <div className='mt-4 rounded-lg border border-border p-4 text-sm'>
            <div className='flex flex-wrap justify-between gap-2'>
              <strong>{request.seriesId}</strong>
              <span className='font-bold text-primary'>{request.status}</span>
            </div>
            <p className='mt-2 text-muted-foreground'>{request.planDescription}</p>
          </div>
        )}
      </section>
      <OperationDialogPanel icon={GitPullRequestArrow} title={t('operations.startTransferSection')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <input name='transferRequestId' required readOnly={Boolean(request)} defaultValue={request?.id ?? requestId} className={operationInput} placeholder={t('operations.transferRequestId')} />
          <OperationAction intent='startTransfer' label={t('actions.startNegotiation')} />
        </fetcher.Form>
      </OperationDialogPanel>
      <OperationDialogPanel icon={GitPullRequestArrow} title={t('operations.createTransferSection')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <input name='transferRequestId' required readOnly={Boolean(request)} defaultValue={request?.id ?? requestId} className={operationInput} placeholder={t('operations.transferRequestId')} />
          <input
            name='transferAmount'
            type='number'
            min={1}
            required
            className={operationInput}
            placeholder={t('operations.transferAmount')}
          />
          <select name='transferType' className={operationInput}>
            <option value='FULL_TRANSFER'>{t('operations.fullTransfer')}</option>
            <option value='PARTIAL_TRANSFER'>{t('operations.partialTransfer')}</option>
          </select>
          <fieldset className='grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3'>
            <legend className='px-1 text-xs font-bold text-muted-foreground'>{t('operations.ownershipSplit')}</legend>
            <Share name='publisherShare' label={t('operations.publisherShare')} value={50} />
            <Share name='originalMangakaShare' label={t('operations.originalMangakaShare')} value={25} />
            <Share name='newMangakaShare' label={t('operations.newMangakaShare')} value={25} />
            <p className='text-xs text-muted-foreground sm:col-span-3'>{t('operations.ownershipHint')}</p>
          </fieldset>
          <label className='text-sm'>
            <input name='coOwnerApprovalRequired' type='checkbox' className='mr-2' />
            {t('operations.coOwner')}
          </label>
          <OperationAction intent='createTransferContract' label={t('actions.createTransferContract')} />
        </fetcher.Form>
        <OperationFeedback data={fetcher.data} />
      </OperationDialogPanel>
    </OperationsLayout>
  )
}

function Share({ name, label, value }: { name: string; label: string; value: number }) {
  return (
    <label className='text-xs text-muted-foreground'>
      {label}
      <input
        name={name}
        type='number'
        min={0}
        max={100}
        required
        defaultValue={value}
        className={`${operationInput} mt-1`}
      />
    </label>
  )
}
