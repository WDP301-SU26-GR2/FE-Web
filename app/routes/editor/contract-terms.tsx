import { contractControllerUpdateContract, contractControllerUpdateStatus } from '~/api/operations/contracts/contracts'
import { EditorContractTermsPage, type EditorActionResult } from '~/features/editor'
import {
  contractErrorKey,
  datesAreValid,
  loadContractBase,
  optionalText,
  ownershipIsValid,
  required
} from './contract-route-utils'
import type { Route } from './+types/contract-terms'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  return loadContractBase(params.id)
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === 'updateContract') {
      const contractType = required(form, 'contractType') as 'FULL_BUYOUT' | 'REVENUE_SHARE'
      const publisherOwnershipPct = Number(required(form, 'publisherOwnershipPct'))
      const mangakaOwnershipPct = Number(required(form, 'mangakaOwnershipPct'))
      const contractStart = required(form, 'contractStart')
      const contractEnd = required(form, 'contractEnd')
      if (!ownershipIsValid(contractType, publisherOwnershipPct, mangakaOwnershipPct))
        return { ok: false, intent, errorKey: 'ownershipMismatch' }
      if (!datesAreValid(contractStart, contractEnd)) return { ok: false, intent, errorKey: 'invalidContractDates' }
      await contractControllerUpdateContract(
        { id: params.id },
        {
          contractType,
          valuationAmount: Number(required(form, 'valuationAmount')),
          publisherOwnershipPct,
          mangakaOwnershipPct,
          terminationClause: required(form, 'terminationClause'),
          contractStart: new Date(contractStart).toISOString(),
          contractEnd: new Date(contractEnd).toISOString(),
          note: optionalText(form, 'note')
        }
      )
    } else if (intent === 'advanceContract') {
      await contractControllerUpdateStatus(
        { id: params.id },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'MANGAKA_REVIEW' })
        }
      )
    }
    else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent }
  } catch (error) {
    return { ok: false, intent, errorKey: contractErrorKey(error) }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorContractTermsPage {...loaderData} />
}
