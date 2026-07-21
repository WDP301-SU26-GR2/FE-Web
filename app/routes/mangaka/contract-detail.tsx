import { authControllerSendOtp } from '~/api/operations/auth/auth'
import {
  contractControllerGetContractById,
  contractControllerGetPaymentConditions,
  contractControllerCheckStatus,
  contractControllerListAmendments,
  contractControllerRejectAmendment,
  contractControllerRequestChanges,
  contractControllerSignAmendmentMangaka,
  contractControllerSignMangaka,
  contractControllerUpdateStatus
} from '~/api/operations/contracts/contracts'
import { usersControllerGetMe } from '~/api/operations/users/users'
import { MangakaContractDetailPage, type MangakaContractActionResult } from '~/features/mangaka'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { hasValidPaymentCondition } from '~/shared/lib/contracts/payment-conditions'

export function meta() {
  return [{ title: 'Chi tiết hợp đồng - MangakaStudio Pro' }]
}

export async function clientLoader({ params }: { params: { id: string } }) {
  const [contract, progress, conditions, amendments] = await Promise.all([
    contractControllerGetContractById({ id: params.id }),
    contractControllerCheckStatus({ id: params.id }).catch(() => null),
    contractControllerGetPaymentConditions({ contractId: params.id }).catch(() => null),
    contractControllerListAmendments({ contractId: params.id }).catch(() => null)
  ])
  if (contract.status !== 200) throw new Response('Không tìm thấy hợp đồng', { status: contract.status })
  return {
    contract: contract.data,
    progress: progress?.status === 200 ? progress.data : null,
    progressLoadFailed: progress == null,
    conditions: conditions?.status === 200 ? conditions.data.data : [],
    amendments: amendments?.status === 200 ? amendments.data : [],
    conditionsLoadFailed: conditions == null
  }
}

export async function clientAction({
  request,
  params
}: {
  request: Request
  params: { id: string }
}): Promise<MangakaContractActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (['approve', 'sendOtp', 'signContract'].includes(intent))
      await assertValidPaymentConditions(params.id)
    if (intent === 'approve')
      await contractControllerUpdateStatus(
        { id: params.id },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'MANGAKA_APPROVED' })
        }
      )
    else if (intent === 'requestChanges')
      await contractControllerRequestChanges(
        { id: params.id },
        { reason: required(form, 'reason') }
      )
    else if (intent === 'sendOtp') {
      const me = await usersControllerGetMe()
      if (me.status !== 200) throw new Error('Không thể đọc tài khoản')
      await authControllerSendOtp({ email: me.data.email, purpose: 'SIGNING_CONTRACT' })
    } else if (intent === 'signContract') {
      await contractControllerSignMangaka({ id: params.id }, { otpCode: required(form, 'otpCode') })
    } else if (intent === 'signAmendment') {
      await contractControllerSignAmendmentMangaka(
        { contractId: params.id, id: required(form, 'amendmentId') },
        { otpCode: required(form, 'otpCode') }
      )
    } else if (intent === 'rejectAmendment') {
      await contractControllerRejectAmendment(
        { contractId: params.id, id: required(form, 'amendmentId') },
        { reason: required(form, 'reason') }
      )
    } else return { ok: false, intent, message: 'Thao tác không hợp lệ.' }
    return { ok: true, intent }
  } catch (error) {
    return {
      ok: false,
      intent,
      message: extractApiErrorMessage(error, 'Không thể thực hiện thao tác. Vui lòng kiểm tra trạng thái và thử lại.')
    }
  }
}

async function assertValidPaymentConditions(contractId: string) {
  const response = await contractControllerGetPaymentConditions({ contractId })
  if (response.status !== 200 || !hasValidPaymentCondition(response.data.data))
    throw new Error('Không thể duyệt hoặc ký vì hợp đồng chưa có điều kiện thanh toán hợp lệ.')
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function MangakaContractDetailRoute({
  loaderData
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  return <MangakaContractDetailPage {...loaderData} />
}
