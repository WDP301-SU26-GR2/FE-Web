import { boardControllerSuggestMembers } from '~/api/operations/board/board'
import { seriesControllerListSeries, seriesControllerPitch } from '~/api/operations/series/series'
import { EditorBoardPitchingPage, type EditorActionResult } from '~/features/editor'
import { required } from './board-route-utils'
import type { Route } from './+types/board-pitching'

export async function clientLoader() {
  try {
    const response = await seriesControllerListSeries({ status: 'READY_TO_PITCH', limit: 100, offset: 0 })
    const series = response.data.items
    const suggestionEntries = await Promise.all(
      series.map(async (item) => {
        const suggestion = await boardControllerSuggestMembers({ seriesId: item.id }).catch(() => null)
        return [item.id, suggestion?.status === 200 ? suggestion.data.items : []] as const
      })
    )
    return { series, suggestions: Object.fromEntries(suggestionEntries), hasError: false }
  } catch {
    return { series: [], suggestions: {}, hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent !== 'pitch') return { ok: false, intent, errorKey: 'invalidAction' }
    await seriesControllerPitch({ id: required(form, 'seriesId') })
    return { ok: true, intent, messageKey: intent }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorBoardPitchingPage {...loaderData} />
}
