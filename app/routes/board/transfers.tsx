import { boardControllerGetDecisionDetails, boardControllerGetDecisions } from '~/api/operations/board/board'
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
import { AssignFullBuyoutBodyDtoConditionsItemType } from '~/api/model/transfer'
import { SendOtpBodyDtoPurpose } from '~/api/model/auth'
import { usersControllerGetMe } from '~/api/operations/users/users'
import { BoardTransfersPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/transfers'
import { extractApiErrorCode, extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { mapWithConcurrency } from '~/shared/lib/api/map-with-concurrency'
import type { ShouldRevalidateFunction } from 'react-router'
import { isEnumValue } from '~/shared/lib/is-enum-value'

const TRANSFER_MONEY_MINIMUM = 1
const TRANSFER_MONEY_MAXIMUM = 100_000_000_000
const DETAIL_REQUEST_CONCURRENCY = 6

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url)
  const requestedContractId = url.searchParams.get('contractId')?.trim() ?? ''
  const requestId = url.searchParams.get('requestId')?.trim() ?? ''
  try {
    const [requests, decisionResponse, focusedRequest] = await Promise.all([
      transferControllerGetPendingBoardRequests(),
      boardControllerGetDecisions({ mine: 'true' }),
      requestId ? transferControllerGetTransferRequestById({ id: requestId }).catch(() => null) : null
    ])
    const contractId =
      requestedContractId || (focusedRequest?.status === 200 ? focusedRequest.data.transferContractId : '') || ''
    const [contract, signatures] = await Promise.all([
      contractId ? transferControllerGetTransferContractById({ id: contractId }).catch(() => null) : null,
      contractId ? transferControllerGetSignatures({ id: contractId }).catch(() => null) : null
    ])
    const requestItems = await mapWithConcurrency(requests.data.data, DETAIL_REQUEST_CONCURRENCY, (item) =>
      transferControllerGetTransferRequestById({ id: item.id })
        .then((response) => response.data)
        .catch(() => null)
    )
    const availableRequests = requestItems.filter((item) => item !== null)
    if (focusedRequest?.status === 200 && !availableRequests.some((item) => item.id === focusedRequest.data.id)) {
      availableRequests.unshift(focusedRequest.data)
    }
    const decisionDetails = await mapWithConcurrency(
      decisionResponse.data.filter(
        (decision) =>
          (decision.decisionType === 'TRANSFER' && ['APPROVED', 'REJECTED'].includes(decision.result ?? '')) ||
          (decision.decisionType === 'CONTRACT' && decision.result === 'APPROVED')
      ),
      DETAIL_REQUEST_CONCURRENCY,
      (decision) =>
        boardControllerGetDecisionDetails({ id: decision.id })
          .then((response) => response.data)
          .catch(() => null)
    )
    const transferDecisions = [
      ...new Map(
        decisionDetails
          .filter(
            (decision) =>
              decision !== null &&
              decision.decisionType === 'TRANSFER' &&
              ['APPROVED', 'REJECTED'].includes(decision.result ?? '')
          )
          .map((decision) => [decision!.id, decision!])
      ).values()
    ]
    const approvedContractDecision =
      decisionDetails.find(
        (decision) =>
          decision !== null &&
          decision.decisionType === 'CONTRACT' &&
          decision.result === 'APPROVED' &&
          decision.targetSeriesId === contract?.data.seriesId &&
          decision.details?.resourceType === 'TRANSFER_CONTRACT' &&
          decision.details?.resourceId === contractId
      ) ?? null
    return {
      requests: availableRequests,
      decisions: transferDecisions,
      contract: contract?.status === 200 ? contract.data : null,
      approvedContractDecision,
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
      approvedContractDecision: null,
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
      const conditionDescriptions = form.getAll('conditionDescription').map((value) => String(value).trim())
      const valuationAmount = Number(required(form, 'valuationAmount'))
      if (
        !Number.isSafeInteger(valuationAmount) ||
        valuationAmount < TRANSFER_MONEY_MINIMUM ||
        valuationAmount > TRANSFER_MONEY_MAXIMUM ||
        !conditionTypes.length ||
        conditionTypes.some(
          (type, index) =>
            !isEnumValue(AssignFullBuyoutBodyDtoConditionsItemType, type) ||
            !conditionDescriptions[index] ||
            !Number.isFinite(conditionValues[index]) ||
            conditionValues[index] <= 0
        )
      ) {
        throw new Error('Điều kiện hợp đồng chưa đầy đủ.')
      }
      const response = await transferControllerBoardAssignFullBuyout(
        { id: required(form, 'requestId') },
        {
          valuationAmount,
          conditions: conditionTypes.map((type, index) => ({
            type: type as (typeof AssignFullBuyoutBodyDtoConditionsItemType)[keyof typeof AssignFullBuyoutBodyDtoConditionsItemType],
            value: conditionValues[index],
            description: conditionDescriptions[index]
          }))
        }
      )
      const updatedRequest = await transferControllerGetTransferRequestById({
        id: required(form, 'requestId')
      })
      return {
        ok: true,
        intent,
        messageKey: 'fullBuyoutAssigned',
        request: updatedRequest.data,
        replacementContractId: response.data.replacementContractId
      }
    } else if (intent === 'sendOtp') {
      await requireApprovedTransferContractDecision(required(form, 'contractId'))
      const me = await usersControllerGetMe()
      if (me.status !== 200) throw new Error('Không thể đọc thông tin tài khoản.')
      await authControllerSendOtp({ email: me.data.email, purpose: SendOtpBodyDtoPurpose.SIGNING_CONTRACT })
    } else if (intent === 'sign') {
      const contractId = required(form, 'contractId')
      await requireApprovedTransferContractDecision(contractId)
      const [contract, signatures] = await Promise.all([
        transferControllerGetTransferContractById({ id: contractId }),
        transferControllerGetSignatures({ id: contractId })
      ])
      if (contract.status !== 200) throw new Error('Không thể tải điều khoản hợp đồng chuyển nhượng.')
      if (contract.data.status !== 'B_SIGNED') throw new Error('Hợp đồng chưa đến lượt Hội đồng ký.')
      if (signatures.status !== 200) throw new Error('Không thể tải tiến độ chữ ký.')
      const signedRoles = new Set(signatures.data.signatures.map((signature) => signature.role))
      if (!signedRoles.has('MANGAKA_A') || !signedRoles.has('MANGAKA_B')) {
        throw new Error('Cần đủ chữ ký của hai tác giả trước khi Hội đồng ký.')
      }
      await transferControllerSignTransferContract({ id: contractId }, { otpCode: required(form, 'otpCode') })
    } else return { ok: false, intent }
    const requestId = String(form.get('requestId') ?? '') || undefined
    const updatedRequest =
      requestId && ['approve', 'reject'].includes(intent)
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
            : intent === 'sendOtp'
              ? 'otpSent'
              : 'transferContractSigned',
      requestId,
      request: updatedRequest
    }
  } catch (error) {
    return {
      ok: false,
      intent,
      errorCode: extractApiErrorCode(error),
      message: extractApiErrorMessage(error, 'Không thể hoàn tất thao tác chuyển nhượng.')
    }
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

async function requireApprovedTransferContractDecision(contractId: string) {
  const contract = await transferControllerGetTransferContractById({ id: contractId })
  if (contract.status !== 200 || !contract.data.seriesId)
    throw new Error('Không thể xác định series của hợp đồng chuyển nhượng.')

  const decisions = await boardControllerGetDecisions({
    mine: 'true',
    targetSeriesId: contract.data.seriesId
  })
  const details = await mapWithConcurrency(
    decisions.data.filter((decision) => decision.decisionType === 'CONTRACT' && decision.result === 'APPROVED'),
    DETAIL_REQUEST_CONCURRENCY,
    (decision) =>
      boardControllerGetDecisionDetails({ id: decision.id })
        .then((response) => response.data)
        .catch(() => null)
  )
  const approved = details.some(
    (decision) => decision?.details?.resourceType === 'TRANSFER_CONTRACT' && decision.details.resourceId === contractId
  )
  if (!approved) throw new Error('Hợp đồng chuyển nhượng chưa có quyết định CONTRACT được Hội đồng phê duyệt.')
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardTransfersPage {...loaderData} />
}
