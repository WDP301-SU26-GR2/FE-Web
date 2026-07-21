import {
  contractControllerGetPaymentConditions,
  contractControllerUpdateContract,
  contractControllerUpdateStatus
} from '~/api/operations/contracts/contracts'
import { EditorContractTermsPage, type EditorActionResult } from '~/features/editor'
import { hasValidPaymentCondition } from '~/shared/lib/contracts/payment-conditions'
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
  const [base, conditions] = await Promise.all([
    loadContractBase(params.id),
    contractControllerGetPaymentConditions({ contractId: params.id }).catch(() => null)
  ])
  return { ...base, conditions: conditions?.status === 200 ? conditions.data.data : [] }
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === 'advanceContract') {
      if (!(await contractHasValidPaymentCondition(params.id))) throw new Error('PAYMENT_CONDITION_REQUIRED')
      await contractControllerUpdateStatus(
        { id: params.id },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'MANGAKA_REVIEW' })
        }
      )
    } else if (intent === 'updateContract' || intent === 'saveAndAdvanceContract') {
      const contractType = required(form, 'contractType') as 'FULL_BUYOUT' | 'REVENUE_SHARE'
      const publisherOwnershipPct = Number(required(form, 'publisherOwnershipPct'))
      const mangakaOwnershipPct = Number(required(form, 'mangakaOwnershipPct'))
      const contractStart = required(form, 'contractStart')
      const contractEnd = required(form, 'contractEnd')
      if (!ownershipIsValid(contractType, publisherOwnershipPct, mangakaOwnershipPct))
        return { ok: false, intent, errorKey: 'ownershipMismatch' }
      if (!datesAreValid(contractStart, contractEnd)) return { ok: false, intent, errorKey: 'invalidContractDates' }
      if (intent === 'saveAndAdvanceContract' && !(await contractHasValidPaymentCondition(params.id)))
        throw new Error('PAYMENT_CONDITION_REQUIRED')
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
      if (intent === 'saveAndAdvanceContract') {
        await contractControllerUpdateStatus(
          { id: params.id },
          {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'MANGAKA_REVIEW' })
          }
        )
      }
    } else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent }
  } catch (error) {
    return { ok: false, intent, errorKey: contractErrorKey(error) }
  }
}

async function contractHasValidPaymentCondition(contractId: string) {
  const response = await contractControllerGetPaymentConditions({ contractId })
  return response.status === 200 && hasValidPaymentCondition(response.data.data)
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorContractTermsPage {...loaderData} />
}
