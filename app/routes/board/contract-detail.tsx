import { boardControllerGetSessionById } from '~/api/operations/board/board'
import { authControllerSendOtp } from '~/api/operations/auth/auth'
import {
  contractAmendmentControllerGetAmendment,
  contractAmendmentControllerListAmendments,
  contractAmendmentControllerSignAmendmentBoard,
  contractControllerBoardApprove,
  contractControllerBoardRequestChanges,
  contractControllerCheckStatus,
  contractControllerGetContractById,
  contractControllerGetContractVersionById,
  contractControllerGetContractVersions,
  contractControllerSignBoard,
  paymentConditionControllerGetPaymentConditions
} from '~/api/operations/contracts/contracts'
import { usersControllerGetMe } from '~/api/operations/users/users'
import { BoardContractDetailPage, type BoardActionResult } from '~/features/board'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import type { Route } from './+types/contract-detail'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [contract, progress, amendments, conditions, versions] = await Promise.all([
    contractControllerGetContractById({ id: params.id }),
    contractControllerCheckStatus({ id: params.id }).catch(() => null),
    contractAmendmentControllerListAmendments({ contractId: params.id }).catch(() => null),
    paymentConditionControllerGetPaymentConditions({ contractId: params.id }).catch(() => null),
    contractControllerGetContractVersions({ id: params.id }).catch(() => null)
  ])
  const detailedVersions = await Promise.all(
    (versions?.status === 200 ? versions.data : []).map((version) =>
      contractControllerGetContractVersionById({ id: params.id, versionId: version.id })
        .then((response) => response.data)
        .catch(() => null)
    )
  )
  const detailedAmendments = await Promise.all(
    (amendments?.status === 200 ? amendments.data : []).map((amendment) =>
      contractAmendmentControllerGetAmendment({ contractId: params.id, id: amendment.id })
        .then((response) => response.data)
        .catch(() => null)
    )
  )
  if (contract.status !== 200) throw new Response('Not found', { status: 404 })
  const boardSessionId = contract.data.boardDecision?.boardSession?.id
  const boardSession = boardSessionId
    ? await boardControllerGetSessionById({ id: boardSessionId }).catch(() => null)
    : null
  return {
    contract: contract.data,
    boardRoster: boardSession?.status === 200 ? boardSession.data.allowedEditorIds : [],
    boardRosterLoadFailed: Boolean(boardSessionId && boardSession == null),
    progress: progress?.status === 200 ? progress.data : null,
    amendments: detailedAmendments.filter((amendment) => amendment !== null),
    conditions: conditions?.status === 200 ? conditions.data.data : [],
    conditionsLoadFailed: conditions == null,
    versions: detailedVersions.filter((version) => version !== null),
    hasSupplementaryDataError: [progress, amendments, conditions, versions].some((response) => response == null)
  }
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'approve') await contractControllerBoardApprove({ id: params.id })
    else if (intent === 'changes')
      await contractControllerBoardRequestChanges({ id: params.id }, { reason: required(form, 'reason') })
    else if (intent === 'sendOtp') {
      const me = await usersControllerGetMe()
      if (me.status !== 200) throw new Error('Không thể đọc thông tin tài khoản.')
      await authControllerSendOtp({ email: me.data.email, purpose: 'SIGNING_CONTRACT' })
    } else if (intent === 'sign')
      await contractControllerSignBoard({ id: params.id }, { otpCode: required(form, 'otpCode') })
    else if (intent === 'signAmendment')
      await contractAmendmentControllerSignAmendmentBoard(
        { contractId: params.id, id: required(form, 'amendmentId') },
        { otpCode: required(form, 'otpCode') }
      )
    else return { ok: false, intent }
    return {
      ok: true,
      intent,
      messageKey:
        intent === 'approve'
          ? 'contractApproved'
          : intent === 'changes'
            ? 'contractChangesRequested'
            : intent === 'sendOtp'
              ? 'otpSent'
              : intent === 'sign'
                ? 'contractSigned'
                : 'amendmentSigned'
    }
  } catch (error) {
    return {
      ok: false,
      intent,
      message: extractApiErrorMessage(error, 'Không thể thực hiện thao tác. Vui lòng thử lại.')
    }
  }
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardContractDetailPage {...loaderData} />
}
