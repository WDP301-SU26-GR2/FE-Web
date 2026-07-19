import { boardControllerGetSessions } from '~/api/operations/board/board'
import { authControllerSendOtp } from '~/api/operations/auth/auth'
import { usersControllerGetMe } from '~/api/operations/users/users'
import {
  transferControllerBoardApproveScreening,
  transferControllerBoardAssignFullBuyout,
  transferControllerBoardRejectScreening,
  transferControllerGetPendingBoardRequests,
  transferControllerGetSignatures,
  transferControllerSignTransferContract
} from '~/api/operations/transfer/transfer'
import type { AssignFullBuyoutBodyDtoConditionsItemType } from '~/api/model/transfer'
import { BoardTransfersPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/transfers'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const contractId = new URL(request.url).searchParams.get('contractId')?.trim() ?? ''
  try {
    const [requests, sessions, signatures] = await Promise.all([
      transferControllerGetPendingBoardRequests(),
      boardControllerGetSessions(),
      contractId ? transferControllerGetSignatures({ id: contractId }).catch(() => null) : null
    ])
    return {
      requests: requests.data.data,
      sessions: sessions.data.filter((item) => item.status === 'ACTIVE'),
      contractId,
      signatures: signatures?.status === 200 ? signatures.data.signatures : [],
      hasError: false
    }
  } catch {
    return { requests: [], sessions: [], contractId, signatures: [], hasError: true }
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
      await transferControllerBoardAssignFullBuyout(
        { id: required(form, 'requestId') },
        {
          boardSessionId: required(form, 'sessionId'),
          valuationAmount: Number(required(form, 'valuationAmount')),
          conditions: [
            {
              type: required(form, 'conditionType') as AssignFullBuyoutBodyDtoConditionsItemType,
              value: Number(required(form, 'conditionValue')),
              description: required(form, 'conditionDescription')
            }
          ]
        }
      )
    } else if (intent === 'sign') {
      await transferControllerSignTransferContract(
        { id: required(form, 'contractId') },
        { otpCode: required(form, 'otpCode') },
        { signerRole: 'BOARD_MEMBER' }
      )
    } else return { ok: false, intent }
    return { ok: true, intent }
  } catch {
    return { ok: false, intent }
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
