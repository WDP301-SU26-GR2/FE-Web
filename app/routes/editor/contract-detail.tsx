import {
  contractAmendmentControllerListAmendments,
  contractControllerListComments,
  contractControllerRedraft,
  contractControllerGetContractVersions,
  paymentConditionControllerGetPaymentConditions
} from '~/api/operations/contracts/contracts'
import {
  EDITOR_CONTRACT_INTENTS,
  EditorContractDetailPage,
  mapEditorContractError,
  type EditorActionResult
} from '~/features/editor'
import { hydrateAmendments, loadContractBase } from './contract-route-utils'
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
  if (intent !== EDITOR_CONTRACT_INTENTS.redraft) return { ok: false, intent, errorKey: 'invalidAction' }
  try {
    const response = await contractControllerRedraft({ id: params.id })
    return { ok: true, intent, messageKey: intent, contractId: response.data.id }
  } catch (error) {
    return { ok: false, intent, errorKey: mapEditorContractError(error) }
  }
}

export default function EditorContractDetailRoute({ loaderData }: Route.ComponentProps) {
  return <EditorContractDetailPage data={loaderData} />
}
