import { authControllerSendOtp } from '~/api/operations/auth/auth'
import {
  contractControllerBoardApprove,
  contractControllerBoardRequestChanges,
  contractControllerCheckStatus,
  contractControllerGetContractById,
  contractControllerGetContractVersions,
  contractControllerGetPaymentConditions,
  contractControllerListAmendments,
  contractControllerSignAmendmentBoard,
  contractControllerSignBoard
} from '~/api/operations/contracts/contracts'
import { usersControllerGetMe } from '~/api/operations/users/users'
import { BoardContractDetailPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/contract-detail'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [contract, progress, amendments, conditions, versions] = await Promise.all([
    contractControllerGetContractById({ id: params.id }),
    contractControllerCheckStatus({ id: params.id }).catch(() => null),
    contractControllerListAmendments({ contractId: params.id }).catch(() => null),
    contractControllerGetPaymentConditions({ contractId: params.id }).catch(() => null),
    contractControllerGetContractVersions({ id: params.id }).catch(() => null)
  ])
  if (contract.status !== 200) throw new Response('Not found', { status: 404 })
  return {
    contract: contract.data,
    progress: progress?.status === 200 ? progress.data : null,
    amendments: amendments?.status === 200 ? amendments.data : [],
    conditions: conditions?.status === 200 ? conditions.data.data : [],
    versions: versions?.status === 200 ? versions.data : [],
    hasSupplementaryDataError: [progress, amendments, conditions, versions].some((response) => response == null)
  }
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'sendOtp') {
      const me = await usersControllerGetMe()
      if (me.status !== 200) throw new Error('Unable to load current user')
      await authControllerSendOtp({ email: me.data.email, purpose: 'SIGNING_CONTRACT' })
    } else if (intent === 'approve') await contractControllerBoardApprove({ id: params.id })
    else if (intent === 'changes') await contractControllerBoardRequestChanges({ id: params.id })
    else if (intent === 'sign')
      await contractControllerSignBoard({ id: params.id }, { otpCode: required(form, 'otpCode') })
    else if (intent === 'signAmendment')
      await contractControllerSignAmendmentBoard(
        { contractId: params.id, id: required(form, 'amendmentId') },
        { otpCode: required(form, 'otpCode') }
      )
    else return { ok: false, intent }
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
  return <BoardContractDetailPage {...loaderData} />
}
