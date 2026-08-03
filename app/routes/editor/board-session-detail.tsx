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
  contractControllerGetContracts
} from '~/api/operations/contracts/contracts'
import {
  transferControllerGetAssignedEditorRequests,
  transferControllerGetTransferContractById
} from '~/api/operations/transfer/transfer'
import { seriesControllerGetSeries } from '~/api/operations/series/series'
import { CreateBoardDecisionBodyDtoDecisionType } from '~/api/model/board'
import {
  BOARD_SESSION_INTENTS,
  BOARD_DECISION_LIMITS,
  EditorBoardMeetingRoomPage,
  mapBoardSessionError,
  type EditorActionResult
} from '~/features/editor'
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
  return runBoardSessionAction(args)
}

export async function runBoardSessionAction({ request, params }: Route.ClientActionArgs): Promise<EditorActionResult> {
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
      if (!Object.values(CreateBoardDecisionBodyDtoDecisionType).includes(decisionType))
        return { ok: false, intent, errorKey: 'invalidState' }

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
        if (series.data.status !== 'PITCHED') return { ok: false, intent, errorKey: 'invalidState' }
        const startIssueNumber = Number(required(form, 'startIssueNumber'))
        if (
          !Number.isSafeInteger(startIssueNumber) ||
          startIssueNumber < 1 ||
          startIssueNumber > BOARD_DECISION_LIMITS.startIssueMaximum
        )
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
        decision: createdDecision.data
      }
    }
    if (intent === BOARD_SESSION_INTENTS.start) {
      const response = await boardControllerStartSession({ id: params.id })
      if (response.status !== 200) return { ok: false, intent, errorKey: 'actionFailed' }
      return {
        ok: true,
        intent,
        messageKey: intent
      }
    }
    if (intent === BOARD_SESSION_INTENTS.conclude) {
      const response = await boardControllerConcludeSession({ id: params.id })
      if (response.status !== 200) return { ok: false, intent, errorKey: 'actionFailed' }
      return {
        ok: true,
        intent,
        messageKey: intent
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
      phase: response.data.phase
    }
  } catch (error) {
    return {
      ok: false,
      intent,
      errorKey: mapBoardSessionError(error)
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
      const [detail, amendments] = await Promise.all([
        contractControllerGetContractById({ id: contract.id }).catch(() => null),
        contractAmendmentControllerListAmendments({ contractId: contract.id }).catch(() => null)
      ])
      const contractDetail = detail?.status === 200 ? detail.data : null
      const title = contractDetail?.series?.title ?? contract.series?.title ?? contract.id
      const amendmentResources =
        amendments?.status === 200
          ? amendments.data
              .filter((amendment) => amendment.status === 'PENDING_SIGNATURES')
              .map((amendment) => ({
                resourceType: 'CONTRACT_AMENDMENT' as const,
                resourceId: amendment.id,
                versionId: '',
                seriesId: contract.seriesId,
                label: `${title} · ${amendment.id}`
              }))
          : []
      return amendmentResources
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
        label: `${request.series?.title ?? request.seriesId} · ${request.transferContractId}`
      }
    })
  )
  return [...resources.flat(), ...transferResources.filter((resource) => resource !== null)]
}
