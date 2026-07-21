import {
  seriesControllerFinalizeEnding,
  seriesControllerForceCancel,
  seriesControllerHiatus,
  seriesControllerProposeCompletion,
  seriesControllerResume
} from '~/api/operations/series/series'
import { tankobonControllerDashboard } from '~/api/operations/tankobon/tankobon'
import { EditorLifecyclePage, type EditorActionResult } from '~/features/editor'
import { loadOperationalSeries, optionalNumber, required } from './operations-route-utils'
import type { Route } from './+types/operations-lifecycle'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    const focusSeriesId = new URL(request.url).searchParams.get('seriesId') ?? ''
    const [series, defense] = await Promise.all([
      loadOperationalSeries(),
      focusSeriesId ? tankobonControllerDashboard({ id: focusSeriesId }).catch(() => null) : null
    ])
    return { series, focusSeriesId, defense: defense?.status === 200 ? defense.data : null, hasError: false }
  } catch {
    return { series: [], focusSeriesId: '', defense: null, hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === 'hiatus')
      await seriesControllerHiatus({ id: required(form, 'seriesId') }, { reason: required(form, 'reason') })
    else if (intent === 'resumeSeries') await seriesControllerResume({ id: required(form, 'seriesId') })
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
