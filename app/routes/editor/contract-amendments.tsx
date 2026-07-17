import {
  contractControllerCreateAmendment,
  contractControllerListAmendments,
  contractControllerSubmitAmendment,
  contractControllerUpdateAmendment,
  contractControllerVoidAmendment
} from '~/api/operations/contracts/contracts'
import { EditorContractAmendmentsPage, type EditorActionResult } from '~/features/editor'
import {
  clauses,
  contractErrorKey,
  datesAreValid,
  loadContractBase,
  optionalDate,
  optionalNumber,
  optionalText,
  ownershipIsValid,
  required
} from './contract-route-utils'
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
    if (intent === 'createAmendment') {
      const changes = amendmentChanges(form)
      const validationError = validateChanges(form, changes)
      if (validationError) return { ok: false, intent, errorKey: validationError }
      await contractControllerCreateAmendment(
        { contractId: params.id },
        {
          changedClauses: clauses(form),
          reason: optionalText(form, 'reason'),
          ...changes
        }
      )
    } else if (intent === 'updateAmendment') {
      const changes = amendmentChanges(form)
      const validationError = validateChanges(form, changes)
      if (validationError) return { ok: false, intent, errorKey: validationError }
      await contractControllerUpdateAmendment(
        { contractId: params.id, id: required(form, 'amendmentId') },
        { changedClauses: clauses(form), reason: optionalText(form, 'reason'), ...changes }
      )
    } else if (intent === 'submitAmendment') {
      const amendmentId = required(form, 'amendmentId')
      const changes = amendmentChanges(form)
      const validationError = validateChanges(form, changes)
      if (validationError) return { ok: false, intent, errorKey: validationError }
      await contractControllerUpdateAmendment(
        { contractId: params.id, id: amendmentId },
        { changedClauses: clauses(form), reason: optionalText(form, 'reason'), ...changes }
      )
      await contractControllerSubmitAmendment({ contractId: params.id, id: amendmentId })
    } else if (intent === 'voidAmendment')
      await contractControllerVoidAmendment(
        { contractId: params.id, id: required(form, 'amendmentId') },
        { voidReason: required(form, 'voidReason') }
      )
    else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent }
  } catch (error) {
    return { ok: false, intent, errorKey: contractErrorKey(error) }
  }
}

function amendmentChanges(form: FormData) {
  return {
    valuationAmount: optionalNumber(form, 'valuationAmount'),
    publisherOwnershipPct: optionalNumber(form, 'publisherOwnershipPct'),
    mangakaOwnershipPct: optionalNumber(form, 'mangakaOwnershipPct'),
    terminationClause: optionalText(form, 'terminationClause'),
    contractStart: optionalDate(form, 'contractStart'),
    contractEnd: optionalDate(form, 'contractEnd')
  }
}

function validateChanges(form: FormData, changes: ReturnType<typeof amendmentChanges>) {
  const { publisherOwnershipPct, mangakaOwnershipPct, contractStart, contractEnd } = changes
  if (publisherOwnershipPct != null || mangakaOwnershipPct != null) {
    if (
      publisherOwnershipPct == null ||
      mangakaOwnershipPct == null ||
      !ownershipIsValid(required(form, 'contractType'), publisherOwnershipPct, mangakaOwnershipPct)
    )
      return 'ownershipMismatch'
  }
  if (contractStart && contractEnd && !datesAreValid(contractStart, contractEnd)) return 'invalidContractDates'
  return null
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorContractAmendmentsPage {...loaderData} />
}
