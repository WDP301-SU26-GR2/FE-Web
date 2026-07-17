import { contractControllerReportRevenue } from '~/api/operations/contracts/contracts'
import { EditorContractRevenuePage, type EditorActionResult } from '~/features/editor'
import { contractErrorKey, loadContractBase, required } from './contract-route-utils'
import type { Route } from './+types/contract-revenue'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  return loadContractBase(params.id)
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent !== 'reportRevenue') return { ok: false, intent, errorKey: 'invalidAction' }
    await contractControllerReportRevenue(
      { id: params.id },
      { revenue: Number(required(form, 'revenue')), period: required(form, 'period') }
    )
    return { ok: true, intent, messageKey: intent }
  } catch (error) {
    return { ok: false, intent, errorKey: contractErrorKey(error) }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorContractRevenuePage {...loaderData} />
}
