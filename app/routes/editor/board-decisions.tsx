import {
  boardControllerCreateDecision,
  boardControllerCastVote,
  boardControllerGetDecisionDetails,
  boardControllerGetDecisions,
  boardControllerGetSessionById,
  boardControllerGetSessions
} from '~/api/operations/board/board'
import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { EditorBoardDecisionsPage, type EditorActionResult } from '~/features/editor'
import { required } from './board-route-utils'
import type { Route } from './+types/board-decisions'

export async function clientLoader() {
  try {
    const [series, sessions, decisions] = await Promise.all([
      seriesControllerListSeries({ status: 'PITCHED', limit: 100, offset: 0 }),
      boardControllerGetSessions(),
      boardControllerGetDecisions()
    ])
    return {
      series: series.data.items,
      sessions: sessions.data,
      decisions: decisions.data,
      sessionPhases: Object.fromEntries(sessions.data.map((session) => [session.id, readBoardSessionPhase(session)])),
      hasError: false
    }
  } catch {
    return { series: [], sessions: [], decisions: [], sessionPhases: {}, hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'createDecision') {
      await boardControllerCreateDecision({
        boardSessionId: required(form, 'sessionId'),
        targetSeriesId: required(form, 'seriesId'),
        decisionType: 'SERIALIZATION',
        details: {
          magazine: required(form, 'magazine'),
          startIssueNumber: Number(required(form, 'startIssueNumber')),
          publicationType: required(form, 'publicationType')
        }
      })
    } else if (intent === 'castVote') {
      const decisionId = required(form, 'decisionId')
      const decision = await boardControllerGetDecisionDetails({ id: decisionId })
      if (decision.status !== 200) return { ok: false, intent, errorKey: 'invalidState' }
      const session = await boardControllerGetSessionById({ id: decision.data.boardSessionId })
      if (
        session.status !== 200 ||
        session.data.status !== 'ACTIVE' ||
        readBoardSessionPhase(session.data) !== 'VOTING'
      )
        return { ok: false, intent, errorKey: 'invalidState' }
      await boardControllerCastVote(
        { id: decisionId },
        {
          voteValue: required(form, 'voteValue') as 'APPROVE' | 'REJECT' | 'ABSTAIN',
          note: String(form.get('note') ?? '').trim() || undefined
        }
      )
    } else {
      return { ok: false, intent, errorKey: 'invalidAction' }
    }
    return { ok: true, intent, messageKey: intent }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorBoardDecisionsPage {...loaderData} />
}
