import {
  boardControllerCastVote,
  boardControllerGetDecisionDetails,
  boardControllerGetDecisionVotes,
  boardControllerGetReports,
  boardControllerGetSessionById
} from '~/api/operations/board/board'
import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import { BoardDecisionDetailPage, type BoardActionResult } from '~/features/board'
import type { ClientActionFunctionArgs, ClientLoaderFunctionArgs } from 'react-router'

export async function clientLoader({ params }: ClientLoaderFunctionArgs) {
  const id = requiredParam(params.id)
  const decision = await boardControllerGetDecisionDetails({ id })
  if (decision.status !== 200) throw new Response('Not found', { status: 404 })
  const [votes, reports, session] = await Promise.all([
    boardControllerGetDecisionVotes({ id }),
    boardControllerGetReports({ boardDecisionId: id }),
    boardControllerGetSessionById({ id: decision.data.boardSessionId })
  ])
  if (votes.status !== 200 || session.status !== 200) throw new Response('Not found', { status: 404 })
  return {
    decision: decision.data,
    votes: votes.data,
    reports: reports.data,
    sessionStatus: session.data.status,
    sessionPhase: readBoardSessionPhase(session.data),
    sessionTitle: session.data.title,
    sessionStartTime: session.data.startTime,
    allowedEditorIds: session.data.allowedEditorIds
  }
}

export async function clientAction({ request, params }: ClientActionFunctionArgs): Promise<BoardActionResult> {
  const id = requiredParam(params.id)
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent !== 'vote') return { ok: false, intent }
    const decision = await boardControllerGetDecisionDetails({ id })
    if (decision.status !== 200) return { ok: false, intent }
    const session = await boardControllerGetSessionById({ id: decision.data.boardSessionId })
    if (session.status !== 200 || session.data.status !== 'ACTIVE' || readBoardSessionPhase(session.data) !== 'VOTING')
      return { ok: false, intent }
    await boardControllerCastVote(
      { id },
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

function requiredParam(value: string | undefined) {
  if (!value) throw new Response('Not found', { status: 404 })
  return value
}

export default function RouteComponent({ loaderData }: { loaderData: Awaited<ReturnType<typeof clientLoader>> }) {
  return <BoardDecisionDetailPage {...loaderData} backPath='/dashboard/editor/board/decisions' />
}
