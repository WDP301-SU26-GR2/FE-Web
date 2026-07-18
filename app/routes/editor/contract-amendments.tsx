import {
  contractControllerCreateAmendment,
  contractControllerListAmendments,
  contractControllerSubmitAmendment,
  contractControllerUpdateAmendment,
  contractControllerVoidAmendment
} from '~/api/operations/contracts/contracts'
import { EditorContractAmendmentsPage, type EditorActionResult } from '~/features/editor'
import { clauses, loadContractBase, required } from './contract-route-utils'
import type { Route } from './+types/contract-amendments'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [base, response] = await Promise.all([
    loadContractBase(params.id),
    contractControllerListAmendments({ contractId: params.id }).catch(() => null)
  ])
  return { ...base, amendments: response?.status === 200 ? response.data : [] }
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === 'createAmendment')
      await contractControllerCreateAmendment(
        { contractId: params.id },
        {
          changedClauses: clauses(form),
          reason: required(form, 'reason'),
          ...(form.get('valuationAmount') ? { valuationAmount: Number(form.get('valuationAmount')) } : {})
        }
      )
    else if (intent === 'updateAmendment')
      await contractControllerUpdateAmendment(
        { contractId: params.id, id: required(form, 'amendmentId') },
        { changedClauses: clauses(form), reason: required(form, 'reason') }
      )
    else if (intent === 'submitAmendment')
      await contractControllerSubmitAmendment({ contractId: params.id, id: required(form, 'amendmentId') })
    else if (intent === 'voidAmendment')
      await contractControllerVoidAmendment(
        { contractId: params.id, id: required(form, 'amendmentId') },
        { voidReason: required(form, 'reason') }
      )
    else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorContractAmendmentsPage {...loaderData} />
}
