import {
  boardControllerCastVote,
  boardControllerCreateDecision,
  boardControllerGetDecisions,
  boardControllerGetSessions
} from '~/api/operations/board/board'
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
    return { series: series.data.items, sessions: sessions.data, decisions: decisions.data, hasError: false }
  } catch {
    return { series: [], sessions: [], decisions: [], hasError: true }
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
      await boardControllerCastVote(
        { id: required(form, 'decisionId') },
        {
          voteValue: required(form, 'voteValue') as 'APPROVE' | 'REJECT' | 'ABSTAIN',
          note: String(form.get('note') ?? '') || undefined
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
