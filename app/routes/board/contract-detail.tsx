import { boardControllerGetDecisionDetails, boardControllerGetDecisions } from '~/api/operations/board/board'
import { authControllerSendOtp } from '~/api/operations/auth/auth'
import {
  contractAmendmentControllerGetAmendment,
  contractAmendmentControllerListAmendments,
  contractAmendmentControllerSignAmendmentBoard,
  contractControllerAddComment,
  contractControllerCheckStatus,
  contractControllerClaim,
  contractControllerGetContractById,
  contractControllerGetContractVersionById,
  contractControllerGetContractVersions,
  contractControllerListComments,
  contractControllerReportRevenue,
  contractControllerRelease,
  contractControllerSignRepresentative,
  paymentConditionControllerGetPaymentConditions
} from '~/api/operations/contracts/contracts'
import { usersControllerGetMe } from '~/api/operations/users/users'
import type { BoardDecisionResDtoOutput } from '~/api/model/board'
import { SendOtpBodyDtoPurpose } from '~/api/model/auth'
import { BoardContractDetailPage, type BoardActionResult } from '~/features/board'
import { extractApiErrorCode, extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { mapWithConcurrency } from '~/shared/lib/api/map-with-concurrency'
import { hasValidPaymentCondition } from '~/shared/lib/contracts/payment-conditions'
import type { Route } from './+types/contract-detail'
import i18n from '~/shared/lib/i18n'

const tBoard = i18n.getFixedT(null, 'board')
const DETAIL_REQUEST_CONCURRENCY = 6

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [contract, progress, amendments, conditions, versions, comments] = await Promise.all([
    contractControllerGetContractById({ id: params.id }),
    contractControllerCheckStatus({ id: params.id }).catch(() => null),
    contractAmendmentControllerListAmendments({ contractId: params.id }).catch(() => null),
    paymentConditionControllerGetPaymentConditions({ contractId: params.id }).catch(() => null),
    contractControllerGetContractVersions({ id: params.id }).catch(() => null),
    contractControllerListComments({ id: params.id }).catch(() => null)
  ])
  const detailedVersions = await mapWithConcurrency(
    versions?.status === 200 ? versions.data : [],
    DETAIL_REQUEST_CONCURRENCY,
    (version) =>
      contractControllerGetContractVersionById({ id: params.id, versionId: version.id })
        .then((response) => response.data)
        .catch(() => null)
  )
  const detailedAmendments = await mapWithConcurrency(
    amendments?.status === 200 ? amendments.data : [],
    DETAIL_REQUEST_CONCURRENCY,
    (amendment) =>
      contractAmendmentControllerGetAmendment({ contractId: params.id, id: amendment.id })
        .then((response) => response.data)
        .catch(() => null)
  )
  if (contract.status !== 200) throw new Response('Not found', { status: 404 })
  const decisionList = await boardControllerGetDecisions({
    mine: 'true',
    targetSeriesId: contract.data.seriesId
  }).catch(() => null)
  const decisionDetails = await mapWithConcurrency(
    (decisionList?.data ?? []).filter(
      (decision) => decision.decisionType === 'CONTRACT' || decision.decisionType === 'SERIALIZATION'
    ),
    DETAIL_REQUEST_CONCURRENCY,
    (decision) =>
      boardControllerGetDecisionDetails({ id: decision.id })
        .then((response) => response.data)
        .catch(() => null)
  )
  const approvedAmendmentDecisions = decisionDetails.filter(
    (decision): decision is BoardDecisionResDtoOutput =>
      decision !== null &&
      decision.decisionType === 'CONTRACT' &&
      decision.result === 'APPROVED' &&
      decision.targetSeriesId === contract.data.seriesId &&
      decision.details?.resourceType === 'CONTRACT_AMENDMENT' &&
      typeof decision.details.resourceId === 'string'
  )
  const isContractRosterMember = decisionDetails.some(
    (decision) => decision?.decisionType === 'SERIALIZATION' && decision.result === 'APPROVED'
  )
  return {
    contract: contract.data,
    approvedAmendmentDecisions,
    isContractRosterMember,
    progress: progress?.status === 200 ? progress.data : null,
    amendments: detailedAmendments.filter((amendment) => amendment !== null),
    conditions: conditions?.status === 200 ? conditions.data.data : [],
    conditionsLoadFailed: conditions == null,
    versions: detailedVersions.filter((version) => version !== null),
    comments: comments?.status === 200 ? comments.data.data : [],
    hasSupplementaryDataError: [progress, amendments, conditions, versions].some((response) => response == null)
  }
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'sign') {
      const conditions = await paymentConditionControllerGetPaymentConditions({ contractId: params.id })
      if (conditions.status !== 200 || !hasValidPaymentCondition(conditions.data.data))
        return {
          ok: false,
          intent,
          message: tBoard('contracts.paymentConditionsRequired')
        }
    }
    if (intent === 'claim') await contractControllerClaim({ id: params.id })
    else if (intent === 'release') await contractControllerRelease({ id: params.id })
    else if (intent === 'addComment')
      await contractControllerAddComment({ id: params.id }, { content: required(form, 'content') })
    else if (intent === 'sendOtp') {
      const me = await usersControllerGetMe()
      if (me.status !== 200) throw new Error('Không thể đọc thông tin tài khoản.')
      await authControllerSendOtp({ email: me.data.email, purpose: SendOtpBodyDtoPurpose.SIGNING_CONTRACT })
    } else if (intent === 'sign')
      await contractControllerSignRepresentative({ id: params.id }, { otpCode: required(form, 'otpCode') })
    else if (intent === 'reportRevenue') {
      const revenue = Number(required(form, 'revenue'))
      if (!Number.isFinite(revenue) || revenue <= 0) return { ok: false, intent }
      await contractControllerReportRevenue({ id: params.id }, { revenue, period: required(form, 'period') })
    } else if (intent === 'signAmendment')
      await contractAmendmentControllerSignAmendmentBoard(
        { contractId: params.id, id: required(form, 'amendmentId') },
        { otpCode: required(form, 'otpCode') }
      )
    else return { ok: false, intent }
    return {
      ok: true,
      intent,
      messageKey:
        intent === 'claim'
          ? 'contractRepresentativeClaimed'
          : intent === 'release'
            ? 'contractRepresentativeReleased'
            : intent === 'addComment'
              ? 'contractCommentAdded'
              : intent === 'sendOtp'
                ? 'otpSent'
                : intent === 'sign'
                  ? 'contractSigned'
                  : intent === 'reportRevenue'
                    ? 'revenueReported'
                    : 'amendmentSigned'
    }
  } catch (error) {
    return {
      ok: false,
      intent,
      errorCode: extractApiErrorCode(error),
      message: extractApiErrorMessage(error, tBoard('common.failure'))
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
