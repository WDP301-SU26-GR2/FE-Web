import { authControllerSendOtp } from '~/api/operations/auth/auth'
import {
  contractControllerGetContractById,
  contractControllerGetContractVersions,
  paymentConditionControllerGetPaymentConditions,
  contractControllerCheckStatus,
  contractAmendmentControllerListAmendments,
  contractAmendmentControllerGetAmendment,
  contractAmendmentControllerRejectAmendment,
  contractAmendmentControllerSignAmendmentMangaka,
  contractControllerReject,
  contractControllerSignMangaka
} from '~/api/operations/contracts/contracts'
import { usersControllerGetMe } from '~/api/operations/users/users'
import { MangakaContractDetailPage, type MangakaContractActionResult } from '~/features/mangaka'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import i18n from '~/shared/lib/i18n'

const tMangaka = i18n.getFixedT(null, 'mangaka')

export function meta() {
  return [{ title: tMangaka('contracts.meta.detailTitle') }]
}

export async function clientLoader({ params }: { params: { id: string } }) {
  const [contract, progress, conditions, amendments, versions] = await Promise.all([
    contractControllerGetContractById({ id: params.id }),
    contractControllerCheckStatus({ id: params.id }).catch(() => null),
    paymentConditionControllerGetPaymentConditions({ contractId: params.id }).catch(() => null),
    contractAmendmentControllerListAmendments({ contractId: params.id }).catch(() => null),
    contractControllerGetContractVersions({ id: params.id }).catch(() => null)
  ])
  if (contract.status !== 200) throw new Response(tMangaka('contracts.errors.notFound'), { status: contract.status })
  const amendmentDetails =
    amendments?.status === 200
      ? await Promise.all(
          amendments.data.map(async (amendment) => {
            try {
              const detail = await contractAmendmentControllerGetAmendment({ contractId: params.id, id: amendment.id })
              return detail.status === 200 ? detail.data : null
            } catch {
              return null
            }
          })
        )
      : []

  return {
    contract: contract.data,
    progress: progress?.status === 200 ? progress.data : null,
    progressLoadFailed: progress == null,
    conditions: conditions?.status === 200 ? conditions.data.data : [],
    amendments: amendmentDetails.filter((amendment) => amendment != null),
    amendmentsLoadFailed: amendments == null || amendmentDetails.some((amendment) => amendment == null),
    conditionsLoadFailed: conditions == null,
    versions: versions?.status === 200 ? versions.data : [],
    versionsLoadFailed: versions == null
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
    if (intent === 'rejectContract')
      await contractControllerReject({ id: params.id }, { reason: required(form, 'reason') })
    else if (intent === 'sendOtp') {
      const me = await usersControllerGetMe()
      if (me.status !== 200) throw new Error(tMangaka('contracts.errors.accountUnavailable'))
      await authControllerSendOtp({ email: me.data.email, purpose: 'SIGNING_CONTRACT' })
    } else if (intent === 'signContract') {
      await contractControllerSignMangaka({ id: params.id }, { otpCode: required(form, 'otpCode') })
    } else if (intent === 'signAmendment') {
      await contractAmendmentControllerSignAmendmentMangaka(
        { contractId: params.id, id: required(form, 'amendmentId') },
        { otpCode: required(form, 'otpCode') }
      )
    } else if (intent === 'rejectAmendment') {
      await contractAmendmentControllerRejectAmendment(
        { contractId: params.id, id: required(form, 'amendmentId') },
        { reason: required(form, 'reason') }
      )
    } else return { ok: false, intent, message: tMangaka('contracts.errors.invalidAction') }
    return { ok: true, intent }
  } catch (error) {
    return {
      ok: false,
      intent,
      message: extractApiErrorMessage(error, tMangaka('contracts.errors.actionFailed'))
    }
  }
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(tMangaka('contracts.errors.requiredField'))
  return value
}

export default function MangakaContractDetailRoute({
  loaderData
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  return <MangakaContractDetailPage {...loaderData} />
}
