import {
  contractControllerCreatePaymentCondition,
  contractControllerDisablePaymentCondition,
  contractControllerGetPaymentConditions,
  contractControllerUpdatePaymentCondition
} from '~/api/operations/contracts/contracts'
import { EditorContractConditionsPage, type EditorActionResult } from '~/features/editor'
import { contractErrorKey, loadContractBase, paymentThreshold, required } from './contract-route-utils'
import type { Route } from './+types/contract-conditions'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [base, response] = await Promise.all([
    loadContractBase(params.id),
    contractControllerGetPaymentConditions({ contractId: params.id }).catch(() => null)
  ])
  return { ...base, conditions: response?.status === 200 ? response.data.data : [] }
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === 'createCondition')
      await contractControllerCreatePaymentCondition(
        { contractId: params.id },
        {
          conditionType: required(form, 'conditionType') as
            | 'CHAPTER_MILESTONE'
            | 'RECURRING_CHAPTER'
            | 'RANKING_MILESTONE'
            | 'TIME_BOUND',
          thresholdConfig: paymentThreshold(form),
          isRecurring: required(form, 'conditionType') === 'RECURRING_CHAPTER',
          ...(form.get('payoutAmount') ? { payoutAmount: Number(form.get('payoutAmount')) } : {}),
          ...(form.get('payoutPct') ? { payoutPct: Number(form.get('payoutPct')) } : {})
        }
      )
    else if (intent === 'disableCondition')
      await contractControllerDisablePaymentCondition({
        contractId: params.id,
        conditionId: required(form, 'conditionId')
      })
    else if (intent === 'updateCondition')
      await contractControllerUpdatePaymentCondition(
        { contractId: params.id, conditionId: required(form, 'conditionId') },
        {
          thresholdConfig: paymentThreshold(form),
          isRecurring: required(form, 'conditionType') === 'RECURRING_CHAPTER',
          ...(form.get('payoutAmount') ? { payoutAmount: Number(form.get('payoutAmount')) } : {}),
          ...(form.get('payoutPct') ? { payoutPct: Number(form.get('payoutPct')) } : {})
        }
      )
    else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent }
  } catch (error) {
    return { ok: false, intent, errorKey: contractErrorKey(error) }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorContractConditionsPage {...loaderData} />
}
