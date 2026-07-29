import { boardControllerGetDecisions, boardControllerGetSessions } from '~/api/operations/board/board'
import { authControllerSendOtp } from '~/api/operations/auth/auth'
import {
  transferControllerBoardApproveScreening,
  transferControllerBoardAssignFullBuyout,
  transferControllerBoardRejectScreening,
  transferControllerGetPendingBoardRequests,
  transferControllerGetTransferContractById,
  transferControllerGetTransferRequestById,
  transferControllerGetSignatures,
  transferControllerSignTransferContract
} from '~/api/operations/transfer/transfer'
import type { AssignFullBuyoutBodyDtoConditionsItemType } from '~/api/model/transfer'
import { usersControllerGetMe } from '~/api/operations/users/users'
import { BoardTransfersPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/transfers'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import type { ShouldRevalidateFunction } from 'react-router'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url)
  const requestedContractId = url.searchParams.get('contractId')?.trim() ?? ''
  const requestId = url.searchParams.get('requestId')?.trim() ?? ''
  try {
    const [requests, sessions, focusedRequest] = await Promise.all([
      transferControllerGetPendingBoardRequests(),
      boardControllerGetSessions({ mine: 'true' }),
      requestId ? transferControllerGetTransferRequestById({ id: requestId }).catch(() => null) : null
    ])
    const contractId =
      requestedContractId || (focusedRequest?.status === 200 ? focusedRequest.data.transferContractId : '') || ''
    const [contract, signatures] = await Promise.all([
      contractId ? transferControllerGetTransferContractById({ id: contractId }).catch(() => null) : null,
      contractId ? transferControllerGetSignatures({ id: contractId }).catch(() => null) : null
    ])
    const requestItems = await Promise.all(
      requests.data.data.map((item) =>
        transferControllerGetTransferRequestById({ id: item.id })
          .then((response) => response.data)
          .catch(() => null)
      )
    )
    const availableRequests = requestItems.filter((item) => item !== null)
    if (focusedRequest?.status === 200 && !availableRequests.some((item) => item.id === focusedRequest.data.id)) {
      availableRequests.unshift(focusedRequest.data)
    }
    const decisionResponses = await Promise.all(
      sessions.data.map((session) => boardControllerGetDecisions({ boardSessionId: session.id }).catch(() => null))
    )
    const transferDecisions = [
      ...new Map(
        decisionResponses
          .flatMap((response) => response?.data ?? [])
          .filter(
            (decision) =>
              decision.decisionType === 'TRANSFER' && ['APPROVED', 'REJECTED'].includes(decision.result ?? '')
          )
          .map((decision) => [decision.id, decision])
      ).values()
    ]
    return {
      requests: availableRequests,
      decisions: transferDecisions,
      contract: contract?.status === 200 ? contract.data : null,
      contractId,
      requestId,
      signatures: signatures?.status === 200 ? signatures.data.signatures : [],
      hasError: false
    }
  } catch {
    return {
      requests: [],
      decisions: [],
      contract: null,
      contractId: requestedContractId,
      requestId,
      signatures: [],
      hasError: true
    }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'approve' || intent === 'reject') {
      const params = { id: required(form, 'requestId') }
      const body = {
        boardDecisionId: required(form, 'boardDecisionId'),
        details: String(form.get('details') ?? '') || undefined
      }
      if (intent === 'approve') await transferControllerBoardApproveScreening(params, body)
      else await transferControllerBoardRejectScreening(params, body)
    } else if (intent === 'fullBuyout') {
      const conditionTypes = form.getAll('conditionType').map(String)
      const conditionValues = form.getAll('conditionValue').map(Number)
      const conditionDescriptions = form.getAll('conditionDescription').map(String)
      if (
        !conditionTypes.length ||
        conditionTypes.some((_, index) => !conditionDescriptions[index] || !Number.isFinite(conditionValues[index]))
      ) {
        throw new Error('Điều kiện hợp đồng chưa đầy đủ.')
      }
      await transferControllerBoardAssignFullBuyout(
        { id: required(form, 'requestId') },
        {
          valuationAmount: Number(required(form, 'valuationAmount')),
          conditions: conditionTypes.map((type, index) => ({
            type: type as AssignFullBuyoutBodyDtoConditionsItemType,
            value: conditionValues[index],
            description: conditionDescriptions[index]
          }))
        }
      )
    } else if (intent === 'sendOtp') {
      const me = await usersControllerGetMe()
      if (me.status !== 200) throw new Error('Không thể đọc thông tin tài khoản.')
      await authControllerSendOtp({ email: me.data.email, purpose: 'SIGNING_CONTRACT' })
    } else if (intent === 'sign') {
      const contractId = required(form, 'contractId')
      const [contract, signatures] = await Promise.all([
        transferControllerGetTransferContractById({ id: contractId }),
        transferControllerGetSignatures({ id: contractId })
      ])
      if (contract.status !== 200) throw new Error('Không thể tải điều khoản hợp đồng chuyển nhượng.')
      if (signatures.status !== 200) throw new Error('Không thể tải tiến độ chữ ký.')
      const signedRoles = new Set(signatures.data.signatures.map((signature) => signature.role))
      if (!signedRoles.has('MANGAKA_A') || !signedRoles.has('MANGAKA_B')) {
        throw new Error('Cần đủ chữ ký của hai Mangaka trước khi Hội đồng ký.')
      }
      await transferControllerSignTransferContract({ id: contractId }, { otpCode: required(form, 'otpCode') })
    } else return { ok: false, intent }
    const requestId = String(form.get('requestId') ?? '') || undefined
    const updatedRequest =
      requestId && ['approve', 'reject', 'fullBuyout'].includes(intent)
        ? await transferControllerGetTransferRequestById({ id: requestId })
            .then((response) => response.data)
            .catch(() => undefined)
        : undefined
    return {
      ok: true,
      intent,
      messageKey:
        intent === 'approve'
          ? 'transferScreeningApproved'
          : intent === 'reject'
            ? 'transferScreeningRejected'
            : intent === 'fullBuyout'
              ? 'fullBuyoutAssigned'
              : intent === 'sendOtp'
                ? 'otpSent'
                : 'transferContractSigned',
      requestId,
      request: updatedRequest
    }
  } catch (error) {
    return { ok: false, intent, message: extractApiErrorMessage(error, 'Không thể hoàn tất thao tác chuyển nhượng.') }
  }
}

export const shouldRevalidate: ShouldRevalidateFunction = ({ actionResult, defaultShouldRevalidate }) => {
  const result = actionResult as BoardActionResult | undefined
  return result?.request ? false : defaultShouldRevalidate
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '')
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardTransfersPage {...loaderData} />
}
