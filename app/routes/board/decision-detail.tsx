import {
  boardControllerCastVote,
  boardControllerGetDecisionDetails,
  boardControllerGetDecisionVotes,
  boardControllerGetSessionById,
  boardControllerGetReports
} from '~/api/operations/board/board'
import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import { BoardDecisionDetailPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/decision-detail'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const decision = await boardControllerGetDecisionDetails({ id: params.id })
  if (decision.status !== 200) throw new Response('Not found', { status: 404 })
  const [votes, reports, session] = await Promise.all([
    boardControllerGetDecisionVotes({ id: params.id }),
    boardControllerGetReports(),
    boardControllerGetSessionById({ id: decision.data.boardSessionId })
  ])
  if (votes.status !== 200 || session.status !== 200) throw new Response('Not found', { status: 404 })
  return {
    decision: decision.data,
    votes: votes.data,
    reports: reports.data.filter((item) => item.boardDecisionId === params.id),
    sessionStatus: session.data.status,
    sessionPhase: readBoardSessionPhase(session.data)
  }
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
    await boardControllerCastVote(
      { id: params.id },
      {
        voteValue: String(form.get('voteValue')) as 'APPROVE' | 'REJECT' | 'ABSTAIN',
        note: String(form.get('note') ?? '') || undefined
      }
    )
    return { ok: true, intent }
  } catch {
    return { ok: false, intent }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardDecisionDetailPage {...loaderData} />
}
