import {
  transferControllerCreateTransferContract,
  transferControllerGetAssignedEditorRequests,
  transferControllerGetSignatures,
  transferControllerGetTransferContractById,
  transferControllerGetTransferRequestById,
  transferControllerStartNegotiation
} from '~/api/operations/transfer/transfer'
import { EditorTransfersPage, type EditorActionResult } from '~/features/editor'
import { required } from './operations-route-utils'
import type { Route } from './+types/operations-transfers'
import {
  CreateTransferContractBodyDtoTransferType,
  TransferControllerGetAssignedEditorRequestsStatus
} from '~/api/model/transfer'
import { isEnumValue } from '~/shared/lib/is-enum-value'
import { extractApiErrorCode } from '~/shared/lib/api/extract-api-error'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url)
  const requestId = url.searchParams.get('requestId')?.trim() ?? ''
  const requestedContractId = url.searchParams.get('contractId')?.trim() ?? ''
  const status = url.searchParams.get('status')?.trim() ?? ''
  try {
    let statusFilter: TransferControllerGetAssignedEditorRequestsStatus | undefined
    if (status) {
      if (!isEnumValue(TransferControllerGetAssignedEditorRequestsStatus, status))
        throw new Error('Invalid transfer status')
      statusFilter = status
    }
    const assigned = await transferControllerGetAssignedEditorRequests(
      statusFilter ? { status: statusFilter } : undefined
    )
    if (!requestId && !requestedContractId)
      return {
        requests: assigned.data.data,
        request: null,
        contract: null,
        requestId: '',
        contractId: '',
        status,
        signatures: [],
        hasError: false
      }
    const response = requestId ? await transferControllerGetTransferRequestById({ id: requestId }) : null
    const transferRequest = response?.status === 200 ? response.data : null
    const contractId = requestedContractId || transferRequest?.transferContractId || ''
    const [contract, signatures] = await Promise.all([
      contractId ? transferControllerGetTransferContractById({ id: contractId }).catch(() => null) : null,
      contractId ? transferControllerGetSignatures({ id: contractId }).catch(() => null) : null
    ])
    return {
      requests: assigned.data.data,
      request: transferRequest,
      contract: contract?.status === 200 ? contract.data : null,
      requestId,
      contractId,
      status,
      signatures: signatures?.status === 200 ? signatures.data.signatures : [],
      hasError: Boolean(requestId && response?.status !== 200)
    }
  } catch {
    return {
      requests: [],
      request: null,
      contract: null,
      requestId,
      contractId: requestedContractId,
      status,
      signatures: [],
      hasError: true
    }
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
      const transferType = required(form, 'transferType')
      const transferAmount = Number(required(form, 'transferAmount'))
      if (!isEnumValue(CreateTransferContractBodyDtoTransferType, transferType))
        return { ok: false, intent, errorKey: 'invalidAction' }
      if (
        !Number.isFinite(transferAmount) ||
        transferAmount <= 0 ||
        Object.values(newOwnershipSplit).some((value) => !Number.isFinite(value) || value < 0)
      )
        return { ok: false, intent, errorKey: 'invalidContractMoney' }
      if (Math.abs(Object.values(newOwnershipSplit).reduce((sum, value) => sum + value, 0) - 100) > 0.001)
        return { ok: false, intent, errorKey: 'ownershipMismatch' }
      if (transferType === 'FULL_TRANSFER' && newOwnershipSplit.originalMangaka !== 0)
        return { ok: false, intent, errorKey: 'ownershipMismatch' }
      if (transferType === 'PARTIAL_TRANSFER' && newOwnershipSplit.originalMangaka <= 0)
        return { ok: false, intent, errorKey: 'ownershipMismatch' }
      const response = await transferControllerCreateTransferContract({
        transferRequestId: required(form, 'transferRequestId'),
        transferAmount,
        transferType,
        newOwnershipSplit,
        coOwnerApprovalRequired: transferType === 'PARTIAL_TRANSFER'
      })
      if (response.status !== 201) return { ok: false, intent, errorKey: 'actionFailed' }
      return {
        ok: true,
        intent,
        messageKey: intent,
        transferContractId: response.data.id
      }
    } else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent }
  } catch (error) {
    return { ok: false, intent, errorKey: transferErrorKey(extractApiErrorCode(error)) }
  }
}

function transferErrorKey(code?: string) {
  const keys: Record<string, string> = {
    'Error.InvalidTransferState': 'transferInvalidState',
    'Error.OnlyAppliesToRevenueShare': 'transferRevenueShareOnly',
    'Error.TransferAccessDenied': 'transferAccessDenied',
    'Error.TransferRequestNotFound': 'transferRequestNotFound',
    'Error.InvalidOwnershipSplit': 'ownershipMismatch'
  }
  return (code && keys[code]) || 'actionFailed'
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorTransfersPage {...loaderData} />
}
