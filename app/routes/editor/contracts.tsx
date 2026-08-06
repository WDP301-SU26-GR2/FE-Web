import { boardControllerGetDecisions, boardControllerGetSessions } from '~/api/operations/board/board'
import {
  contractControllerCreateDraft,
  contractControllerGetContractById,
  contractControllerGetContracts,
  paymentConditionControllerCreatePaymentCondition
} from '~/api/operations/contracts/contracts'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { BoardDecisionResDtoOutputDecisionType, BoardDecisionResDtoOutputResult } from '~/api/model/board'
import { SeriesListResDtoOutputItemsItemStatus } from '~/api/model/series'
import {
  EDITOR_CONTRACT_INTENTS,
  EditorContractsPage,
  contractDatesAreValid,
  contractOwnershipIsValid,
  contractValuationIsValid,
  isContractType,
  mapEditorContractError,
  type EditorActionResult,
  type EditorContractsData
} from '~/features/editor'
import { SITE } from '~/shared/config/site'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'
import { mapWithConcurrency } from '~/shared/lib/api/map-with-concurrency'
import { paymentPayout, paymentThreshold, required } from './contract-route-utils'
import { hydrateBoardDecisions, hydrateBoardSessions } from './board-route-utils'

import type { Route } from './+types/contracts'

export function meta() {
  return [{ title: SITE.name }]
}

const DETAIL_REQUEST_CONCURRENCY = 6

export async function clientLoader(): Promise<EditorContractsData & { hasError: boolean }> {
  try {
    const [contracts, series, decisions, sessions] = await Promise.all([
      contractControllerGetContracts(),
      listSerializedSeries(),
      boardControllerGetDecisions(),
      boardControllerGetSessions()
    ])
    const contractDetails = await mapWithConcurrency(contracts.data, DETAIL_REQUEST_CONCURRENCY, async (contract) => {
      const response = await contractControllerGetContractById({ id: contract.id }).catch(() => null)
      return response?.status === 200 ? response.data : null
    })
    return {
      contracts: contractDetails.filter((contract) => contract != null),
      series,
      decisions: (await hydrateBoardDecisions(decisions.data)).filter(
        (item) =>
          item.decisionType === BoardDecisionResDtoOutputDecisionType.SERIALIZATION &&
          item.result === BoardDecisionResDtoOutputResult.APPROVED
      ),
      sessions: await hydrateBoardSessions(sessions.data),
      hasError: false
    }
  } catch {
    return { contracts: [], series: [], decisions: [], sessions: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const formData = await request.formData()
  const intent = String(formData.get('intent') ?? '')
  if (intent !== EDITOR_CONTRACT_INTENTS.create) return { ok: false, intent, errorKey: 'invalidAction' }
  try {
    const seriesId = required(formData, 'seriesId')
    const contractType = required(formData, 'contractType')
    const valuationAmount = Number(required(formData, 'valuationAmount'))
    const publisherOwnershipPct = Number(required(formData, 'publisherOwnershipPct'))
    const mangakaOwnershipPct = Number(required(formData, 'mangakaOwnershipPct'))
    const contractStart = required(formData, 'contractStart')
    const contractEnd = required(formData, 'contractEnd')
    if (!isContractType(contractType)) return { ok: false, intent, errorKey: 'invalidAction' }
    if (!contractValuationIsValid(valuationAmount)) return { ok: false, intent, errorKey: 'invalidContractMoney' }
    if (!contractOwnershipIsValid(contractType, publisherOwnershipPct, mangakaOwnershipPct))
      return { ok: false, intent, errorKey: 'ownershipMismatch' }
    if (!contractDatesAreValid(contractStart, contractEnd))
      return { ok: false, intent, errorKey: 'invalidContractDates' }
    const conditionType = required(formData, 'conditionType') as
      | 'CHAPTER_MILESTONE'
      | 'RECURRING_CHAPTER'
      | 'RANKING_MILESTONE'
      | 'TIME_BOUND'
    const thresholdConfig = paymentThreshold(formData)
    const payout = paymentPayout(formData)
    const createdContract = await contractControllerCreateDraft({
      seriesId,
      mangakaId: required(formData, 'mangakaId'),
      boardDecisionId: required(formData, 'boardDecisionId'),
      contractType,
      valuationAmount,
      publisherOwnershipPct,
      mangakaOwnershipPct,
      terminationClause: required(formData, 'terminationClause'),
      contractStart: new Date(contractStart).toISOString(),
      contractEnd: new Date(contractEnd).toISOString()
    })
    await paymentConditionControllerCreatePaymentCondition(
      { contractId: createdContract.data.id },
      {
        conditionType,
        thresholdConfig,
        isRecurring: conditionType === 'RECURRING_CHAPTER',
        ...payout
      }
    )
    return { ok: true, intent, messageKey: 'createContract', contractId: createdContract.data.id }
  } catch (error) {
    return { ok: false, intent, errorKey: mapEditorContractError(error) }
  }
}

export default function EditorContractsRoute({ loaderData }: Route.ComponentProps) {
  return <EditorContractsPage data={loaderData} hasError={loaderData.hasError} />
}

async function listSerializedSeries() {
  return loadAllOffsetItems((pagination) =>
    seriesControllerListSeries({
      status: SeriesListResDtoOutputItemsItemStatus.SERIALIZED,
      ...pagination
    }).then((response) => response.data)
  ) satisfies Promise<SeriesListResDtoOutputItemsItem[]>
}
