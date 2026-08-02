import {
  boardControllerCastVote,
  boardControllerGetDecisionDetails,
  boardControllerGetSessionById
} from '~/api/operations/board/board'
import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import { CastVoteBodyDtoVoteValue } from '~/api/model/board'
import { BoardDecisionDetailPage, type BoardActionResult } from '~/features/board'
import { isEnumValue } from '~/shared/lib/is-enum-value'
import { extractApiErrorCode } from '~/shared/lib/api/extract-api-error'
import { loadBoardDecisionDetail } from './decision-detail-loader'
import type { Route } from './+types/decision-detail'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  return loadBoardDecisionDetail(params.id)
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent !== 'vote') return { ok: false, intent }
    const decision = await boardControllerGetDecisionDetails({ id: params.id })
    if (decision.status !== 200) return { ok: false, intent }
    const session = await boardControllerGetSessionById({ id: decision.data.boardSessionId })
    if (session.status !== 200 || session.data.status !== 'ACTIVE' || readBoardSessionPhase(session.data) !== 'VOTING')
      return { ok: false, intent }
    const voteValue = String(form.get('voteValue') ?? '')
    const note = String(form.get('note') ?? '').trim()
    if (!isEnumValue(CastVoteBodyDtoVoteValue, voteValue) || note.length > 300) return { ok: false, intent }
    await boardControllerCastVote(
      { id: params.id },
      {
        voteValue,
        note: note || undefined
      }
    )
    return { ok: true, intent, messageKey: 'voteSubmitted' }
  } catch (error) {
    return { ok: false, intent, errorCode: extractApiErrorCode(error) }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  const resourceHref = contractResourceHref(loaderData.decision.details, loaderData.contractResourceParentId)
  return (
    <BoardDecisionDetailPage
      {...loaderData}
      resourceHref={resourceHref}
      backPath={`/dashboard/board/sessions/${loaderData.decision.boardSessionId}`}
    />
  )
}

function contractResourceHref(
  details: Record<string, unknown> | null | undefined,
  contractResourceParentId: string | null
) {
  if (!details || typeof details.resourceId !== 'string') return undefined
  if (details.resourceType === 'PUBLICATION_CONTRACT' || details.resourceType === 'REPLACEMENT_CONTRACT')
    return `/dashboard/board/contracts/${encodeURIComponent(details.resourceId)}`
  if (details.resourceType === 'TRANSFER_CONTRACT')
    return `/dashboard/board/transfers?contractId=${encodeURIComponent(details.resourceId)}`
  if (details.resourceType === 'CONTRACT_AMENDMENT' && contractResourceParentId)
    return `/dashboard/board/contracts/${encodeURIComponent(contractResourceParentId)}?amendmentId=${encodeURIComponent(details.resourceId)}`
  return undefined
}
