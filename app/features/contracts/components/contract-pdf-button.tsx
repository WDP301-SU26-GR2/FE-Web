import { useState } from 'react'
import { AlertTriangle, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import type { ContractResDtoOutput } from '~/api/model/contracts'
import { getContractPdf } from '~/api/manual/contract-latest'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { cn } from '~/shared/lib/cn'

const PDF_STATUSES: ReadonlySet<ContractResDtoOutput['status']> = new Set([
  'FULLY_EXECUTED',
  'FULFILLED',
  'TERMINATED',
  'TERMINATED_BY_BREACH',
  'EXPIRED'
])

export function ContractPdfButton({
  contract,
  conditionsCount,
  className
}: {
  contract: ContractResDtoOutput
  conditionsCount?: number
  className?: string
}) {
  const [isLoading, setIsLoading] = useState(false)

  if (!PDF_STATUSES.has(contract.status)) return null
  const conditionsMissing = conditionsCount === 0

  const download = async () => {
    const target = window.open('about:blank', '_blank')
    if (target) target.opener = null
    setIsLoading(true)
    try {
      const response = await getContractPdf(contract.id)
      if (target) target.location.href = response.data.downloadUrl
      else window.location.assign(response.data.downloadUrl)
    } catch (error) {
      target?.close()
      toast.error(extractApiErrorMessage(error, 'Không thể tạo bản PDF hợp đồng. Vui lòng thử lại.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex max-w-sm flex-col items-end gap-1.5'>
      <button
        type='button'
        onClick={() => void download()}
        disabled={isLoading || conditionsMissing}
        title={conditionsMissing ? 'Hợp đồng chưa có điều kiện thanh toán hợp lệ.' : undefined}
        className={cn(
          'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-bold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
      >
        {isLoading ? <Loader2 className='size-4 animate-spin' /> : <Download className='size-4' />}
        {isLoading ? 'Đang chuẩn bị PDF…' : 'Tải hợp đồng PDF'}
      </button>
      {conditionsMissing && (
        <p className='inline-flex items-center gap-1 text-right text-xs font-semibold text-destructive'>
          <AlertTriangle className='size-3.5 shrink-0' />
          Chưa có điều kiện thanh toán hợp lệ nên chưa thể tạo PDF đầy đủ.
        </p>
      )}
    </div>
  )
}
