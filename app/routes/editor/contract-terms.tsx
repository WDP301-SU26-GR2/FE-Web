import {
  contractControllerSubmitReview,
  contractControllerUpdateContract,
  paymentConditionControllerGetPaymentConditions
} from '~/api/operations/contracts/contracts'
import type { EditorUpdateContractBodyDtoContractType } from '~/api/model/contracts'
import {
  EDITOR_CONTRACT_INTENTS,
  EditorContractTermsPage,
  contractDatesAreValid,
  contractOwnershipIsValid,
  contractValuationIsValid,
  mapEditorContractError,
  type EditorActionResult
} from '~/features/editor'
import { loadContractBase, optionalText, required } from './contract-route-utils'
import type { Route } from './+types/contract-terms'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [base, conditions] = await Promise.all([
    loadContractBase(params.id),
    paymentConditionControllerGetPaymentConditions({ contractId: params.id }).catch(() => null)
  ])
  return { ...base, conditions: conditions?.status === 200 ? conditions.data.data : [] }
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === EDITOR_CONTRACT_INTENTS.submitReview) {
      await contractControllerSubmitReview({ id: params.id })
    } else if (intent === EDITOR_CONTRACT_INTENTS.update || intent === EDITOR_CONTRACT_INTENTS.saveAndSubmitReview) {
      const contractType = required(form, 'contractType') as EditorUpdateContractBodyDtoContractType
      const valuationAmount = Number(required(form, 'valuationAmount'))
      const publisherOwnershipPct = Number(required(form, 'publisherOwnershipPct'))
      const mangakaOwnershipPct = Number(required(form, 'mangakaOwnershipPct'))
      const contractStart = required(form, 'contractStart')
      const contractEnd = required(form, 'contractEnd')
      if (!contractValuationIsValid(valuationAmount)) return { ok: false, intent, errorKey: 'invalidContractMoney' }
      if (!contractOwnershipIsValid(contractType, publisherOwnershipPct, mangakaOwnershipPct))
        return { ok: false, intent, errorKey: 'ownershipMismatch' }
      if (!contractDatesAreValid(contractStart, contractEnd))
        return { ok: false, intent, errorKey: 'invalidContractDates' }
      await contractControllerUpdateContract(
        { id: params.id },
        {
          contractType,
          valuationAmount,
          publisherOwnershipPct,
          mangakaOwnershipPct,
          terminationClause: required(form, 'terminationClause'),
          contractStart: new Date(contractStart).toISOString(),
          contractEnd: new Date(contractEnd).toISOString(),
          note: optionalText(form, 'note')
        }
      )
      if (intent === EDITOR_CONTRACT_INTENTS.saveAndSubmitReview) {
        await contractControllerSubmitReview({ id: params.id })
      }
    } else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent }
  } catch (error) {
    return { ok: false, intent, errorKey: mapEditorContractError(error) }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorContractTermsPage {...loaderData} />
}
