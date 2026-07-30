import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import {
  boardControllerAdvancePhase,
  boardControllerConcludeSession,
  boardControllerCreateDecision,
  boardControllerGetDecisionDetails,
  boardControllerGetDecisions,
  boardControllerGetSessionById,
  boardControllerGetSessionMessages,
  boardControllerStartSession
} from '~/api/operations/board/board'
import {
  contractAmendmentControllerListAmendments,
  contractControllerGetContractById,
  contractControllerGetContracts,
  contractControllerGetContractVersions
} from '~/api/operations/contracts/contracts'
import {
  transferControllerGetAssignedEditorRequests,
  transferControllerGetTransferContractById
} from '~/api/operations/transfer/transfer'
import { seriesControllerGetSeries, seriesControllerPitch } from '~/api/operations/series/series'
import type { CreateBoardDecisionBodyDtoDecisionType } from '~/api/model/board'
import { EditorBoardMeetingRoomPage, type EditorActionResult } from '~/features/editor'
import { extractApiErrorMessage, extractApiSuccessMessage } from '~/shared/lib/api/extract-api-error'
import { hydrateBoardDecisions, loadBoardSessionSeries, required } from './board-route-utils'
import type { Route } from './+types/board-session-detail'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [session, decisions, messages, series, contracts, transferRequests] = await Promise.all([
    boardControllerGetSessionById({ id: params.id }),
    boardControllerGetDecisions({ boardSessionId: params.id }),
    boardControllerGetSessionMessages({ id: params.id }, { limit: 200, offset: 0 }).catch(() => null),
    loadBoardSessionSeries(),
    contractControllerGetContracts().catch(() => null),
    transferControllerGetAssignedEditorRequests().catch(() => null)
  ])
  if (session.status !== 200) throw new Response('Not found', { status: 404 })
  const assignedTransferRequests = transferRequests?.data.data ?? []
  const contractResources = await loadContractDecisionResources(contracts?.data ?? [], assignedTransferRequests)
  return {
    session: session.data,
    phase: readBoardSessionPhase(session.data),
    decisions: await hydrateBoardDecisions(decisions.data),
    messages: messages?.status === 200 ? messages.data.items : [],
    series,
    contractResources,
    transferRequests: assignedTransferRequests
  }
}

export function clientAction(args: Route.ClientActionArgs): Promise<EditorActionResult> {
  return runBoardSessionAction(args, { allowPitch: true })
}

export async function runBoardSessionAction(
  { request, params }: Route.ClientActionArgs,
  { allowPitch }: { allowPitch: boolean }
): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'addSessionDecision') {
      const session = await boardControllerGetSessionById({ id: params.id })
      const phase = session.status === 200 ? readBoardSessionPhase(session.data) : null
      const canPrepareSession =
        session.status === 200 &&
        (session.data.status === 'UPCOMING' || (session.data.status === 'ACTIVE' && phase === 'PRESENTING'))
      if (!canPrepareSession) return { ok: false, intent, errorKey: 'invalidState' }

      const seriesId = required(form, 'seriesId')
      const series = await seriesControllerGetSeries({ id: seriesId })
      if (series.status !== 200) return { ok: false, intent, errorKey: 'invalidState' }

      const decisionType = required(form, 'decisionType') as CreateBoardDecisionBodyDtoDecisionType
      const supportedDecisionTypes = [
        'SERIALIZATION',
        'CONTINUE',
        'CANCEL',
        'HIATUS',
        'ENDING_ALLOWANCE',
        'SERIES_CONTRACT_APPROVAL',
        'CANCELLATION',
        'FORMAT_CHANGE',
        'COMPLETION',
        'REPRINT',
        'TRANSFER',
        'CONTRACT'
      ]
      if (!supportedDecisionTypes.includes(decisionType)) return { ok: false, intent, errorKey: 'invalidState' }

      const existingDecisions = await boardControllerGetDecisions({ boardSessionId: params.id })
      const existingDecisionDetails = await Promise.all(
        existingDecisions.data.map((decision) =>
          boardControllerGetDecisionDetails({ id: decision.id })
            .then((response) => response.data)
            .catch(() => null)
        )
      )
      const endingTypes = new Set(['COMPLETION', 'CANCELLATION', 'CANCEL'])
      const resourceId = String(form.get('resourceId') ?? '').trim()
      const versionId = String(form.get('versionId') ?? '').trim()
      const transferRequestId = String(form.get('transferRequestId') ?? '').trim()
      const conflicts = existingDecisionDetails.some(
        (decision) =>
          decision !== null &&
          decision.targetSeriesId === seriesId &&
          ((decisionType === 'CONTRACT' &&
            decision.decisionType === 'CONTRACT' &&
            decision.details?.resourceId === resourceId &&
            (decision.details?.versionId ?? '') === versionId) ||
            (decisionType === 'TRANSFER' &&
              decision.decisionType === 'TRANSFER' &&
              decision.details?.transferRequestId === transferRequestId) ||
            (decisionType !== 'CONTRACT' &&
              decisionType !== 'TRANSFER' &&
              (decision.decisionType === decisionType ||
                (endingTypes.has(decision.decisionType ?? '') && endingTypes.has(decisionType)))))
      )
      if (conflicts) return { ok: false, intent, errorKey: 'invalidState' }

      const details: Record<string, unknown> = {}
      if (decisionType === 'SERIALIZATION') {
        if (!['READY_TO_PITCH', 'PITCHED'].includes(series.data.status))
          return { ok: false, intent, errorKey: 'invalidState' }
        if (series.data.status === 'READY_TO_PITCH') {
          if (!allowPitch) return { ok: false, intent, errorKey: 'invalidState' }
          await seriesControllerPitch({ id: seriesId })
        }
        const startIssueNumber = Number(required(form, 'startIssueNumber'))
        if (!Number.isInteger(startIssueNumber) || startIssueNumber < 1)
          return { ok: false, intent, errorKey: 'invalidState' }
        const publicationType = required(form, 'publicationType')
        if (!['WEEKLY', 'MONTHLY', 'IRREGULAR'].includes(publicationType))
          return { ok: false, intent, errorKey: 'invalidState' }
        Object.assign(details, {
          magazine: required(form, 'magazine'),
          startIssueNumber,
          publicationType
        })
      } else {
        if (decisionType !== 'CONTRACT' && !['SERIALIZED', 'HIATUS'].includes(series.data.status))
          return { ok: false, intent, errorKey: 'invalidState' }
        details.note = String(form.get('decisionNote') ?? '').trim() || null
        if (decisionType === 'CANCELLATION' || decisionType === 'ENDING_ALLOWANCE') {
          const allowanceValue = String(form.get('endingChapterAllowance') ?? '').trim()
          if (allowanceValue) {
            const endingChapterAllowance = Number(allowanceValue)
            if (!Number.isInteger(endingChapterAllowance) || endingChapterAllowance < 1 || endingChapterAllowance > 10)
              return { ok: false, intent, errorKey: 'invalidState' }
            details.endingChapterAllowance = endingChapterAllowance
          }
        }
        if (decisionType === 'FORMAT_CHANGE') {
          const publicationType = required(form, 'publicationType')
          if (!['WEEKLY', 'MONTHLY', 'IRREGULAR'].includes(publicationType))
            return { ok: false, intent, errorKey: 'invalidState' }
          details.publicationType = publicationType
        }
        if (decisionType === 'TRANSFER') details.transferRequestId = required(form, 'transferRequestId')
        if (decisionType === 'CONTRACT') {
          const resourceType = required(form, 'resourceType')
          if (
            !['PUBLICATION_CONTRACT', 'REPLACEMENT_CONTRACT', 'TRANSFER_CONTRACT', 'CONTRACT_AMENDMENT'].includes(
              resourceType
            )
          )
            return { ok: false, intent, errorKey: 'invalidState' }
          Object.assign(details, {
            resourceType,
            resourceId: required(form, 'resourceId'),
            ...(versionId ? { versionId } : {})
          })
        }
      }

      const createdDecision = await boardControllerCreateDecision({
        boardSessionId: params.id,
        targetSeriesId: seriesId,
        transferRequestId: decisionType === 'TRANSFER' ? required(form, 'transferRequestId') : null,
        decisionType,
        details
      })
      return {
        ok: true,
        intent,
        messageKey: 'addSessionDecision',
        message: extractApiSuccessMessage(createdDecision, 'Đã thêm quyết định vào phiên họp.'),
        decision: createdDecision.data
      }
    }
    if (intent === 'startSession') {
      const response = await boardControllerStartSession({ id: params.id })
      if (response.status !== 200) return { ok: false, intent, errorKey: 'actionFailed' }
      return {
        ok: true,
        intent,
        messageKey: intent,
        message: extractApiSuccessMessage(response, 'Đã bắt đầu phiên họp Hội đồng.')
      }
    }
    if (intent === 'concludeSession') {
      const response = await boardControllerConcludeSession({ id: params.id })
      if (response.status !== 200) return { ok: false, intent, errorKey: 'actionFailed' }
      return {
        ok: true,
        intent,
        messageKey: intent,
        message: extractApiSuccessMessage(response, 'Đã kết thúc phiên họp Hội đồng.')
      }
    }
    if (intent !== 'advancePhase') return { ok: false, intent, errorKey: 'invalidAction' }
    const phase = String(form.get('phase') ?? '')
    if (phase !== 'QA' && phase !== 'VOTING') return { ok: false, intent, errorKey: 'invalidAction' }
    const response = await boardControllerAdvancePhase({ id: params.id }, { phase })
    if (response.status !== 200) return { ok: false, intent, errorKey: 'actionFailed' }
    return {
      ok: true,
      intent,
      messageKey: 'advancePhase',
      message: extractApiSuccessMessage(
        response,
        phase === 'QA'
          ? 'Đã chuyển phiên họp sang giai đoạn thảo luận.'
          : 'Đã chuyển phiên họp sang giai đoạn bỏ phiếu.'
      ),
      phase: response.data.phase
    }
  } catch (error) {
    return {
      ok: false,
      intent,
      errorKey: 'actionFailed',
      message: extractApiErrorMessage(error, 'Không thể thực hiện thao tác trong phiên họp.')
    }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorBoardMeetingRoomPage {...loaderData} />
}

async function loadContractDecisionResources(
  contracts: Array<{ id: string; seriesId: string; series?: { title?: string } }>,
  transferRequests: Array<{
    seriesId: string
    status: string
    transferContractId?: string | null
    series?: { title?: string } | null
  }>
) {
  const resources = await Promise.all(
    contracts.map(async (contract) => {
      const [detail, versions, amendments] = await Promise.all([
        contractControllerGetContractById({ id: contract.id }).catch(() => null),
        contractControllerGetContractVersions({ id: contract.id }).catch(() => null),
        contractAmendmentControllerListAmendments({ contractId: contract.id }).catch(() => null)
      ])
      const currentVersion = versions?.status === 200 ? versions.data.at(-1) : null
      const contractDetail = detail?.status === 200 ? detail.data : null
      const title = contractDetail?.series?.title ?? contract.series?.title ?? contract.id
      const contractResource =
        contractDetail?.status === 'MANGAKA_APPROVED' && currentVersion
          ? {
              resourceType: contractDetail.sourceTransferRequestId
                ? ('REPLACEMENT_CONTRACT' as const)
                : ('PUBLICATION_CONTRACT' as const),
              resourceId: contract.id,
              versionId: currentVersion.id,
              seriesId: contract.seriesId,
              label: `${title} · ${
                contractDetail.sourceTransferRequestId ? 'Replacement Contract' : 'Publication Contract'
              } · v${currentVersion.versionNumber}`
            }
          : null
      const amendmentResources =
        amendments?.status === 200
          ? amendments.data
              .filter((amendment) => amendment.status === 'PENDING_SIGNATURES')
              .map((amendment) => ({
                resourceType: 'CONTRACT_AMENDMENT' as const,
                resourceId: amendment.id,
                versionId: '',
                seriesId: contract.seriesId,
                label: `${title} · Amendment · ${amendment.id}`
              }))
          : []
      return [...(contractResource ? [contractResource] : []), ...amendmentResources]
    })
  )
  const transferResources = await Promise.all(
    transferRequests.map(async (request) => {
      if (!request.transferContractId || request.status !== 'AWAITING_TRANSFER_SIGNATURES') return null
      const contract = await transferControllerGetTransferContractById({ id: request.transferContractId }).catch(
        () => null
      )
      if (contract?.status !== 200 || contract.data.status !== 'DRAFT') return null
      return {
        resourceType: 'TRANSFER_CONTRACT' as const,
        resourceId: request.transferContractId,
        versionId: '',
        seriesId: request.seriesId,
        label: `${request.series?.title ?? request.seriesId} · Transfer Contract`
      }
    })
  )
  return [...resources.flat(), ...transferResources.filter((resource) => resource !== null)]
}
