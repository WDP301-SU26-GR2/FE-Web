import { GitPullRequestArrow, Info, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
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
  const displayRequest = request as TransferRequestWithRelations | null
  const [transferType, setTransferType] = useState<'FULL_TRANSFER' | 'PARTIAL_TRANSFER'>('FULL_TRANSFER')
  const isRevenueShare = request?.originalContractType === 'REVENUE_SHARE'
  const isUnderReview = request?.status === 'UNDER_REVIEW'
  const canStartNegotiation = Boolean(request && isRevenueShare && isUnderReview)
  const canCreateContract = Boolean(request && isRevenueShare && isUnderReview)
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
              <strong>{displayRequest?.series?.title ?? t('operations.unknownSeries')}</strong>
              <span className='font-bold text-primary'>{t(`operations.transferStatuses.${request.status}`)}</span>
            </div>
            <p className='mt-2 text-muted-foreground'>{request.planDescription}</p>
          </div>
        )}
      </section>
      {!request && (
        <p className='rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>
          Tải một yêu cầu chuyển nhượng để xem đúng bước nghiệp vụ có thể thực hiện.
        </p>
      )}
      {request?.status === 'NEGOTIATING' && (
        <p className='rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground'>
          Đang chờ Mangaka gốc đồng ý hoặc từ chối đề nghị. Editor chưa cần thực hiện thêm thao tác.
        </p>
      )}
      {canStartNegotiation && <OperationDialogPanel icon={GitPullRequestArrow} title={t('operations.startTransferSection')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <input type='hidden' name='transferRequestId' value={request!.id} />
          <p className='rounded-lg bg-muted p-3 text-sm text-muted-foreground'>
            Chỉ bắt đầu bước này sau khi Hội đồng đã qua vòng sàng lọc. Hệ thống sẽ chuyển yêu cầu sang chờ Mangaka gốc phản hồi.
          </p>
          <OperationAction intent='startTransfer' label={t('actions.startNegotiation')} />
        </fetcher.Form>
      </OperationDialogPanel>}
      {canCreateContract && <OperationDialogPanel icon={ShieldCheck} title={t('operations.createTransferSection')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <input type='hidden' name='transferRequestId' value={request!.id} />
          <div className='flex gap-2 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100'>
            <Info className='mt-0.5 size-4 shrink-0' />
            Chỉ tạo hợp đồng sau khi Mangaka gốc đã đồng ý thương lượng và yêu cầu quay lại trạng thái đang xử lý.
          </div>
          <label className='flex items-start gap-2 text-sm text-foreground'>
            <input type='checkbox' required className='mt-1' />
            Tôi đã xác nhận Mangaka gốc đồng ý chuyển nhượng.
          </label>
          <input
            name='transferAmount'
            type='number'
            min={1}
            required
            className={operationInput}
            placeholder={t('operations.transferAmount')}
          />
          <select name='transferType' value={transferType} onChange={(event) => setTransferType(event.target.value as typeof transferType)} className={operationInput}>
            <option value='FULL_TRANSFER'>{t('operations.fullTransfer')}</option>
            <option value='PARTIAL_TRANSFER'>{t('operations.partialTransfer')}</option>
          </select>
          <fieldset key={transferType} className='grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3'>
            <legend className='px-1 text-xs font-bold text-muted-foreground'>{t('operations.ownershipSplit')}</legend>
            <Share name='publisherShare' label={t('operations.publisherShare')} value={50} />
            <Share name='originalMangakaShare' label={t('operations.originalMangakaShare')} value={transferType === 'FULL_TRANSFER' ? 0 : 25} />
            <Share name='newMangakaShare' label={t('operations.newMangakaShare')} value={transferType === 'FULL_TRANSFER' ? 50 : 25} />
            <p className='text-xs text-muted-foreground sm:col-span-3'>{t('operations.ownershipHint')}</p>
          </fieldset>
          <p className='rounded-lg bg-muted p-3 text-xs text-muted-foreground'>
            {transferType === 'PARTIAL_TRANSFER'
              ? 'Chuyển nhượng một phần bắt buộc giữ Mangaka gốc làm đồng sở hữu và duyệt chương mới.'
              : 'Chuyển nhượng toàn bộ sẽ không yêu cầu đồng sở hữu duyệt chương mới.'}
          </p>
          <OperationAction intent='createTransferContract' label={t('actions.createTransferContract')} />
        </fetcher.Form>
        <OperationFeedback data={fetcher.data} />
        {fetcher.data?.ok && fetcher.data.transferContractId && (
          <div className='mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm'>
            <strong>Đã tạo hợp đồng chuyển nhượng.</strong>
            <p className='mt-1 text-muted-foreground'>Mã hợp đồng để ba bên ký: <code className='font-mono text-foreground'>{fetcher.data.transferContractId}</code></p>
          </div>
        )}
      </OperationDialogPanel>}
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
