import {
  transferControllerCreateTransferContract,
  transferControllerGetTransferRequestById,
  transferControllerStartNegotiation
} from '~/api/operations/transfer/transfer'
import { EditorTransfersPage, type EditorActionResult } from '~/features/editor'
import { required } from './operations-route-utils'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import type { Route } from './+types/operations-transfers'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const requestId = new URL(request.url).searchParams.get('requestId')?.trim() ?? ''
  if (!requestId) return { request: null, requestId: '', hasError: false }
  try {
    const response = await transferControllerGetTransferRequestById({ id: requestId })
    return {
      request: response.status === 200 ? response.data : null,
      requestId,
      hasError: response.status !== 200
    }
  } catch {
    return { request: null, requestId, hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === 'startTransfer')
      await transferControllerStartNegotiation({ id: required(form, 'transferRequestId') })
    else if (intent === 'createTransferContract') {
      const newOwnershipSplit = {
        publisher: Number(required(form, 'publisherShare')),
        originalMangaka: Number(required(form, 'originalMangakaShare')),
        newMangaka: Number(required(form, 'newMangakaShare'))
      }
      const transferType = required(form, 'transferType') as 'FULL_TRANSFER' | 'PARTIAL_TRANSFER'
      if (Object.values(newOwnershipSplit).reduce((sum, value) => sum + value, 0) !== 100)
        throw new Error('Invalid ownership split')
      if (transferType === 'FULL_TRANSFER' && newOwnershipSplit.originalMangaka !== 0)
        throw new Error('Chuyển nhượng toàn bộ phải đưa tỷ lệ của Mangaka cũ về 0%.')
      if (transferType === 'PARTIAL_TRANSFER' && newOwnershipSplit.originalMangaka <= 0)
        throw new Error('Chuyển nhượng một phần phải giữ tỷ lệ sở hữu cho Mangaka cũ.')
      const response = await transferControllerCreateTransferContract({
        transferRequestId: required(form, 'transferRequestId'),
        transferAmount: Number(required(form, 'transferAmount')),
        transferType,
        newOwnershipSplit,
        coOwnerApprovalRequired: transferType === 'PARTIAL_TRANSFER'
      })
      if (response.status !== 201) throw new Error('Không nhận được hợp đồng chuyển nhượng vừa tạo.')
      return {
        ok: true,
        intent,
        messageKey: intent,
        transferContractId: response.data.id
      }
    } else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent }
  } catch (error) {
    return {
      ok: false,
      intent,
      errorKey: 'actionFailed',
      message: extractApiErrorMessage(error, 'Không thể hoàn tất thao tác chuyển nhượng.')
    }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorTransfersPage {...loaderData} />
}
