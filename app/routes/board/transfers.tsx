import { boardControllerGetSessions } from '~/api/operations/board/board'
import { authControllerSendOtp } from '~/api/operations/auth/auth'
import { usersControllerGetMe } from '~/api/operations/users/users'
import {
  transferControllerBoardApproveScreening,
  transferControllerBoardAssignFullBuyout,
  transferControllerBoardRejectScreening,
  transferControllerGetPendingBoardRequests,
  transferControllerGetTransferRequestById,
  transferControllerGetSignatures,
  transferControllerSignTransferContract
} from '~/api/operations/transfer/transfer'
import type { AssignFullBuyoutBodyDtoConditionsItemType } from '~/api/model/transfer'
import { BoardTransfersPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/transfers'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url)
  const contractId = url.searchParams.get('contractId')?.trim() ?? ''
  const requestId = url.searchParams.get('requestId')?.trim() ?? ''
  try {
    const [requests, sessions, signatures, focusedRequest] = await Promise.all([
      transferControllerGetPendingBoardRequests(),
      boardControllerGetSessions({ mine: 'true', status: 'ACTIVE' }),
      contractId ? transferControllerGetSignatures({ id: contractId }).catch(() => null) : null,
      requestId ? transferControllerGetTransferRequestById({ id: requestId }).catch(() => null) : null
    ])
    const requestItems = requests.data.data
    if (focusedRequest?.status === 200 && !requestItems.some((item) => item.id === focusedRequest.data.id)) {
      requestItems.unshift(focusedRequest.data as (typeof requestItems)[number])
    }
    return {
      requests: requestItems,
      sessions: sessions.data,
      contractId,
      requestId,
      signatures: signatures?.status === 200 ? signatures.data.signatures : [],
      hasError: false
    }
  } catch {
    return { requests: [], sessions: [], contractId, requestId, signatures: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'sendOtp') {
      const me = await usersControllerGetMe()
      if (me.status !== 200) throw new Error('Unable to load current user')
      await authControllerSendOtp({ email: me.data.email, purpose: 'SIGNING_CONTRACT' })
    } else if (intent === 'approve' || intent === 'reject') {
      const params = { id: required(form, 'requestId') }
      const body = {
        boardSessionId: required(form, 'sessionId'),
        details: String(form.get('details') ?? '') || undefined
      }
      if (intent === 'approve') await transferControllerBoardApproveScreening(params, body)
      else await transferControllerBoardRejectScreening(params, body)
    } else if (intent === 'fullBuyout') {
      const conditionTypes = form.getAll('conditionType').map(String)
      const conditionValues = form.getAll('conditionValue').map(Number)
      const conditionDescriptions = form.getAll('conditionDescription').map(String)
      if (!conditionTypes.length || conditionTypes.some((_, index) => !conditionDescriptions[index] || !Number.isFinite(conditionValues[index]))) {
        throw new Error('Điều kiện hợp đồng chưa đầy đủ.')
      }
      await transferControllerBoardAssignFullBuyout(
        { id: required(form, 'requestId') },
        {
          boardSessionId: required(form, 'sessionId'),
          valuationAmount: Number(required(form, 'valuationAmount')),
          conditions: conditionTypes.map((type, index) => ({
            type: type as AssignFullBuyoutBodyDtoConditionsItemType,
            value: conditionValues[index],
            description: conditionDescriptions[index]
          }))
        }
      )
    } else if (intent === 'sign') {
      const contractId = required(form, 'contractId')
      const signatures = await transferControllerGetSignatures({ id: contractId })
      if (signatures.status !== 200) throw new Error('Không thể tải tiến độ chữ ký.')
      const signedRoles = new Set(signatures.data.signatures.map((signature) => signature.role))
      if (!signedRoles.has('MANGAKA_A') || !signedRoles.has('MANGAKA_B')) {
        throw new Error('Cần đủ chữ ký của hai Mangaka trước khi Hội đồng ký.')
      }
      await transferControllerSignTransferContract(
        { id: contractId },
        { otpCode: required(form, 'otpCode') },
        { signerRole: 'BOARD' }
      )
    } else return { ok: false, intent }
    return {
      ok: true,
      intent,
      messageKey:
        intent === 'sendOtp'
          ? 'transferOtpSent'
          : intent === 'approve'
            ? 'transferScreeningApproved'
            : intent === 'reject'
              ? 'transferScreeningRejected'
              : intent === 'fullBuyout'
                ? 'fullBuyoutAssigned'
                : 'transferContractSigned',
      requestId: String(form.get('requestId') ?? '') || undefined
    }
  } catch (error) {
    return { ok: false, intent, message: extractApiErrorMessage(error, 'Không thể hoàn tất thao tác chuyển nhượng.') }
  }
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '')
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardTransfersPage {...loaderData} />
}
