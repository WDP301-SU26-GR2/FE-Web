import { GitPullRequestArrow } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  OperationAction,
  OperationFeedback,
  OperationPanel,
  OperationsLayout,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

export function EditorTransfersPage() {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  return (
    <OperationsLayout titleKey='operations.transfers' descriptionKey='operations.descriptions.transfers'>
      <OperationPanel icon={GitPullRequestArrow} title={t('operations.startTransferSection')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <input name='transferRequestId' required className={operationInput} placeholder='Transfer request ID' />
          <OperationAction intent='startTransfer' label={t('actions.startNegotiation')} />
        </fetcher.Form>
      </OperationPanel>
      <OperationPanel icon={GitPullRequestArrow} title={t('operations.createTransferSection')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <input name='transferRequestId' required className={operationInput} placeholder='Transfer request ID' />
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
      </OperationPanel>
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
