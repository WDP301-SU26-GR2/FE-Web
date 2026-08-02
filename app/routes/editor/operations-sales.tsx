import { tankobonControllerCreate } from '~/api/operations/tankobon/tankobon'
import { EditorSalesPage, type EditorActionResult } from '~/features/editor'
import { loadOperationalSeries, required } from './operations-route-utils'
import type { Route } from './+types/operations-sales'

export async function clientLoader() {
  try {
    return { series: await loadOperationalSeries(), hasError: false }
  } catch {
    return { series: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent !== 'tankobon') return { ok: false, intent, errorKey: 'invalidAction' }
    const volumeNumber = Number(required(form, 'volumeNumber'))
    const unitsSold = Number(required(form, 'unitsSold'))
    if (!Number.isInteger(volumeNumber) || volumeNumber < 1 || !Number.isInteger(unitsSold) || unitsSold < 0)
      return { ok: false, intent, errorKey: 'invalidAction' }
    await tankobonControllerCreate({
      seriesId: required(form, 'seriesId'),
      volumeNumber,
      unitsSold,
      period: required(form, 'period')
    })
    return { ok: true, intent, messageKey: intent }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorSalesPage {...loaderData} />
}
