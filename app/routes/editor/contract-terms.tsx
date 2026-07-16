import { contractControllerUpdateContract, contractControllerUpdateStatus } from '~/api/operations/contracts/contracts'
import { EditorContractTermsPage, type EditorActionResult } from '~/features/editor'
import { loadContractBase, required } from './contract-route-utils'
import type { Route } from './+types/contract-terms'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  return loadContractBase(params.id)
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === 'updateContract')
      await contractControllerUpdateContract(
        { id: params.id },
        {
          contractType: required(form, 'contractType') as 'FULL_BUYOUT' | 'REVENUE_SHARE',
          valuationAmount: Number(required(form, 'valuationAmount')),
          publisherOwnershipPct: Number(required(form, 'publisherOwnershipPct')),
          mangakaOwnershipPct: Number(required(form, 'mangakaOwnershipPct')),
          terminationClause: required(form, 'terminationClause'),
          contractStart: new Date(required(form, 'contractStart')).toISOString(),
          contractEnd: new Date(required(form, 'contractEnd')).toISOString()
        }
      )
    else if (intent === 'advanceContract') await contractControllerUpdateStatus({ id: params.id })
    else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorContractTermsPage {...loaderData} />
}
