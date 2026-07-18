import { boardControllerCreateDecision, boardControllerGetSessions } from '~/api/operations/board/board'
import type { CreateBoardDecisionBodyDtoDecisionType } from '~/api/model/board'
import { EditorBoardLifecyclePage, type EditorActionResult } from '~/features/editor'
import { loadBoardLifecycleSeries, required } from './board-route-utils'
import type { Route } from './+types/board-lifecycle'

export async function clientLoader() {
  try {
    const [series, sessions] = await Promise.all([loadBoardLifecycleSeries(), boardControllerGetSessions()])
    return {
      series,
      sessions: sessions.data.filter((item) => item.status === 'ACTIVE'),
      hasError: false
    }
  } catch {
    return { series: [], sessions: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent !== 'createLifecycleDecision') return { ok: false, intent, errorKey: 'invalidAction' }
    await boardControllerCreateDecision({
      boardSessionId: required(form, 'sessionId'),
      targetSeriesId: required(form, 'seriesId'),
      decisionType: required(form, 'decisionType') as CreateBoardDecisionBodyDtoDecisionType,
      details: { note: String(form.get('decisionNote') ?? '') || null }
    })
    return { ok: true, intent, messageKey: intent }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorBoardLifecyclePage {...loaderData} />
}
