import {
  transferControllerCreateTransferContract,
  transferControllerGetTransferRequestById,
  transferControllerStartNegotiation
} from '~/api/operations/transfer/transfer'
import { EditorTransfersPage, type EditorActionResult } from '~/features/editor'
import { required } from './operations-route-utils'
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
      if (Object.values(newOwnershipSplit).reduce((sum, value) => sum + value, 0) !== 100)
        throw new Error('Invalid ownership split')
      await transferControllerCreateTransferContract({
        transferRequestId: required(form, 'transferRequestId'),
        transferAmount: Number(required(form, 'transferAmount')),
        transferType: required(form, 'transferType') as 'FULL_TRANSFER' | 'PARTIAL_TRANSFER',
        newOwnershipSplit,
        coOwnerApprovalRequired: form.get('coOwnerApprovalRequired') === 'on'
      })
    } else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: 'operationCompleted' }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorTransfersPage {...loaderData} />
}
