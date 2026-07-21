import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import {
  boardControllerAdvancePhase,
  boardControllerConcludeSession,
  boardControllerCreateDecision,
  boardControllerGetDecisions,
  boardControllerGetSessionById,
  boardControllerGetSessionMessages,
  boardControllerStartSession
} from '~/api/operations/board/board'
import { seriesControllerGetSeries, seriesControllerPitch } from '~/api/operations/series/series'
import type { CreateBoardDecisionBodyDtoDecisionType } from '~/api/model/board'
import { EditorBoardMeetingRoomPage, type EditorActionResult } from '~/features/editor'
import { loadBoardSessionSeries, required } from './board-route-utils'
import type { Route } from './+types/board-session-detail'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [session, decisions, messages, series] = await Promise.all([
    boardControllerGetSessionById({ id: params.id }),
    boardControllerGetDecisions({ boardSessionId: params.id }),
    boardControllerGetSessionMessages({ id: params.id }, { limit: 200, offset: 0 }).catch(() => null),
    loadBoardSessionSeries()
  ])
  if (session.status !== 200) throw new Response('Not found', { status: 404 })
  return {
    session: session.data,
    phase: readBoardSessionPhase(session.data),
    decisions: decisions.data,
    messages: messages?.status === 200 ? messages.data.items : [],
    series
  }
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<EditorActionResult> {
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
      const supportedDecisionTypes = ['SERIALIZATION', 'CONTINUE', 'CANCELLATION', 'FORMAT_CHANGE', 'COMPLETION']
      if (!supportedDecisionTypes.includes(decisionType)) return { ok: false, intent, errorKey: 'invalidState' }

      const details: Record<string, unknown> = {}
      if (decisionType === 'SERIALIZATION') {
        if (!['READY_TO_PITCH', 'PITCHED'].includes(series.data.status))
          return { ok: false, intent, errorKey: 'invalidState' }
        if (series.data.status === 'READY_TO_PITCH') await seriesControllerPitch({ id: seriesId })
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
        if (series.data.status !== 'SERIALIZED') return { ok: false, intent, errorKey: 'invalidState' }
        details.note = String(form.get('decisionNote') ?? '').trim() || null
        if (decisionType === 'CANCELLATION') {
          const endingChapterAllowance = Number(required(form, 'endingChapterAllowance'))
          if (!Number.isInteger(endingChapterAllowance) || endingChapterAllowance < 1)
            return { ok: false, intent, errorKey: 'invalidState' }
          details.endingChapterAllowance = endingChapterAllowance
        }
        if (decisionType === 'FORMAT_CHANGE') {
          const publicationType = required(form, 'publicationType')
          if (!['WEEKLY', 'MONTHLY', 'IRREGULAR'].includes(publicationType))
            return { ok: false, intent, errorKey: 'invalidState' }
          details.publicationType = publicationType
        }
      }

      const createdDecision = await boardControllerCreateDecision({
        boardSessionId: params.id,
        targetSeriesId: seriesId,
        decisionType,
        details
      })
      return { ok: true, intent, messageKey: 'addSessionDecision', decision: createdDecision.data }
    }
    if (intent === 'startSession') {
      const response = await boardControllerStartSession({ id: params.id })
      if (response.status !== 200) return { ok: false, intent, errorKey: 'actionFailed' }
      return { ok: true, intent, messageKey: intent }
    }
    if (intent === 'concludeSession') {
      const response = await boardControllerConcludeSession({ id: params.id })
      if (response.status !== 200) return { ok: false, intent, errorKey: 'actionFailed' }
      return { ok: true, intent, messageKey: intent }
    }
    if (intent !== 'advancePhase') return { ok: false, intent, errorKey: 'invalidAction' }
    const phase = String(form.get('phase') ?? '')
    if (phase !== 'QA' && phase !== 'VOTING') return { ok: false, intent, errorKey: 'invalidAction' }
    const response = await boardControllerAdvancePhase({ id: params.id }, { phase })
    if (response.status !== 200) return { ok: false, intent, errorKey: 'actionFailed' }
    return { ok: true, intent, messageKey: 'advancePhase', phase: response.data.phase }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorBoardMeetingRoomPage {...loaderData} />
}
