import {
  seriesControllerFinalizeEnding,
  seriesControllerForceCancel,
  seriesControllerHiatus,
  seriesControllerProposeCompletion,
  seriesControllerResume
} from '~/api/operations/series/series'
import { boardControllerGetDecisions } from '~/api/operations/board/board'
import { tankobonControllerDashboard } from '~/api/operations/tankobon/tankobon'
import { seriesControllerGetSeries } from '~/api/operations/series/series'
import { EditorLifecyclePage, type EditorActionResult } from '~/features/editor'
import { loadOperationalSeries, optional, optionalNumber, required } from './operations-route-utils'
import type { Route } from './+types/operations-lifecycle'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const searchParams = new URL(request.url).searchParams
  const focusSeriesId = searchParams.get('seriesId') ?? ''
  const sourceDecisionId = searchParams.get('decisionId') ?? ''
  try {
    const [series, focusSeries, defense, decisionHistoryResponse] = await Promise.all([
      loadOperationalSeries(),
      focusSeriesId ? seriesControllerGetSeries({ id: focusSeriesId }).catch(() => null) : null,
      focusSeriesId ? tankobonControllerDashboard({ id: focusSeriesId }).catch(() => null) : null,
      focusSeriesId ? boardControllerGetDecisions({ targetSeriesId: focusSeriesId }).catch(() => null) : null
    ])
    const decisionHistory = decisionHistoryResponse?.status === 200 ? decisionHistoryResponse.data : []
    return {
      series,
      focusSeries: focusSeries?.status === 200 ? focusSeries.data : null,
      focusSeriesId,
      sourceDecisionId,
      sourceDecision: decisionHistory.find((decision) => decision.id === sourceDecisionId) ?? null,
      decisionHistory,
      defense: defense?.status === 200 ? defense.data : null,
      hasError: false
    }
  } catch {
    return {
      series: [],
      focusSeries: null,
      focusSeriesId,
      sourceDecisionId,
      sourceDecision: null,
      decisionHistory: [],
      defense: null,
      hasError: true
    }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === 'hiatus') {
      const expectedReturnDate = optional(form, 'expectedReturnDate')
      await seriesControllerHiatus(
        { id: required(form, 'seriesId') },
        {
          reason: required(form, 'reason'),
          ...(expectedReturnDate ? { expectedReturnDate: new Date(expectedReturnDate).toISOString() } : {})
        }
      )
    } else if (intent === 'resumeSeries') await seriesControllerResume({ id: required(form, 'seriesId') })
    else if (intent === 'proposeCompletion')
      await seriesControllerProposeCompletion(
        { id: required(form, 'seriesId') },
        { reason: required(form, 'reason'), proposedEndingChapters: optionalNumber(form, 'proposedEndingChapters') }
      )
    else if (intent === 'finalizeEnding') await seriesControllerFinalizeEnding({ id: required(form, 'seriesId') })
    else if (intent === 'forceCancel') await seriesControllerForceCancel({ id: required(form, 'seriesId') })
    else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorLifecyclePage {...loaderData} />
}
