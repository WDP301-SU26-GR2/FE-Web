import {
  contractAmendmentControllerListAmendments,
  contractControllerGetContractById,
  contractControllerListComments,
  contractControllerRedraft,
  contractControllerGetContractVersions,
  contractControllerSubmitReview,
  contractControllerUpdateContract,
  paymentConditionControllerCreatePaymentCondition,
  paymentConditionControllerDisablePaymentCondition,
  paymentConditionControllerGetPaymentConditions,
  paymentConditionControllerUpdatePaymentCondition
} from '~/api/operations/contracts/contracts'
import type { EditorUpdateContractBodyDtoContractType } from '~/api/model/contracts'
import {
  EDITOR_CONTRACT_INTENTS,
  EditorContractDetailPage,
  canEditContract,
  contractDatesAreValid,
  contractOwnershipIsValid,
  contractValuationIsValid,
  mapEditorContractError,
  type EditorActionResult
} from '~/features/editor'
import {
  contractErrorKey,
  hydrateAmendments,
  loadContractBase,
  optionalText,
  paymentPayout,
  paymentThreshold,
  required
} from './contract-route-utils'
import type { Route } from './+types/contract-detail'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [base, conditions, versions, amendments, comments] = await Promise.all([
    loadContractBase(params.id),
    paymentConditionControllerGetPaymentConditions({ contractId: params.id }).catch(() => null),
    contractControllerGetContractVersions({ id: params.id }).catch(() => null),
    contractAmendmentControllerListAmendments({ contractId: params.id }).catch(() => null),
    contractControllerListComments({ id: params.id }).catch(() => null)
  ])
  return {
    ...base,
    conditions: conditions?.status === 200 ? conditions.data.data : [],
    versions: versions?.status === 200 ? versions.data : [],
    amendments: amendments?.status === 200 ? await hydrateAmendments(params.id, amendments.data) : [],
    comments: comments?.status === 200 ? comments.data.data : []
  }
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === EDITOR_CONTRACT_INTENTS.redraft) {
      const response = await contractControllerRedraft({ id: params.id })
      return { ok: true, intent, messageKey: intent, contractId: response.data.id }
    }
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
    } else if (isPaymentConditionIntent(intent)) {
      const contract = await contractControllerGetContractById({ id: params.id })
      if (contract.status !== 200) throw new Error('CONTRACT_NOT_FOUND')
      if (!canEditContract(contract.data)) return { ok: false, intent, errorKey: 'paymentConditionLocked' }
      if (intent === 'createCondition') {
        const conditionType = paymentConditionType(form)
        await paymentConditionControllerCreatePaymentCondition(
          { contractId: params.id },
          {
            conditionType,
            thresholdConfig: paymentThreshold(form),
            isRecurring: conditionType === 'RECURRING_CHAPTER',
            ...paymentPayout(form)
          }
        )
      } else if (intent === 'disableCondition') {
        await paymentConditionControllerDisablePaymentCondition({
          contractId: params.id,
          conditionId: required(form, 'conditionId')
        })
      } else {
        const conditionType = paymentConditionType(form)
        await paymentConditionControllerUpdatePaymentCondition(
          { contractId: params.id, conditionId: required(form, 'conditionId') },
          {
            thresholdConfig: paymentThreshold(form),
            isRecurring: conditionType === 'RECURRING_CHAPTER',
            ...paymentPayout(form)
          }
        )
      }
    } else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent }
  } catch (error) {
    return {
      ok: false,
      intent,
      errorKey: isPaymentConditionIntent(intent) ? contractErrorKey(error) : mapEditorContractError(error)
    }
  }
}

export default function EditorContractDetailRoute({ loaderData }: Route.ComponentProps) {
  return <EditorContractDetailPage data={loaderData} />
}

function isPaymentConditionIntent(intent: string) {
  return intent === 'createCondition' || intent === 'updateCondition' || intent === 'disableCondition'
}

function paymentConditionType(form: FormData) {
  return required(form, 'conditionType') as
    | 'CHAPTER_MILESTONE'
    | 'RECURRING_CHAPTER'
    | 'RANKING_MILESTONE'
    | 'TIME_BOUND'
}
