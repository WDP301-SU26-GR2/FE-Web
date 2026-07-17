import { boardControllerGetDecisions } from '~/api/operations/board/board'
import { contractControllerCreateDraft, contractControllerGetContracts } from '~/api/operations/contracts/contracts'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { EditorContractsPage, type EditorActionResult, type EditorContractsData } from '~/features/editor'
import { contractErrorKey, datesAreValid, ownershipIsValid, required } from './contract-route-utils'

import type { Route } from './+types/contracts'

export function meta() {
  return [{ title: 'Contracts - MangaStudio Pro' }]
}

export async function clientLoader(): Promise<EditorContractsData & { hasError: boolean }> {
  try {
    const [contracts, series, decisions] = await Promise.all([
      contractControllerGetContracts(),
      listSerializedSeries(),
      boardControllerGetDecisions()
    ])
    return {
      contracts: contracts.data,
      series,
      decisions: decisions.data.filter((item) => item.decisionType === 'SERIALIZATION' && item.result === 'APPROVED'),
      hasError: false
    }
  } catch {
    return { contracts: [], series: [], decisions: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const formData = await request.formData()
  const intent = String(formData.get('intent') ?? '')
  if (intent !== 'createContract') return { ok: false, intent, errorKey: 'invalidAction' }
  try {
    const seriesId = required(formData, 'seriesId')
    const contractType = required(formData, 'contractType') as 'FULL_BUYOUT' | 'REVENUE_SHARE'
    const publisherOwnershipPct = Number(required(formData, 'publisherOwnershipPct'))
    const mangakaOwnershipPct = Number(required(formData, 'mangakaOwnershipPct'))
    const contractStart = required(formData, 'contractStart')
    const contractEnd = required(formData, 'contractEnd')
    if (!ownershipIsValid(contractType, publisherOwnershipPct, mangakaOwnershipPct))
      return { ok: false, intent, errorKey: 'ownershipMismatch' }
    if (!datesAreValid(contractStart, contractEnd)) return { ok: false, intent, errorKey: 'invalidContractDates' }
    await contractControllerCreateDraft({
      seriesId,
      mangakaId: required(formData, 'mangakaId'),
      boardDecisionId: required(formData, 'boardDecisionId'),
      contractType,
      valuationAmount: Number(required(formData, 'valuationAmount')),
      publisherOwnershipPct,
      mangakaOwnershipPct,
      terminationClause: required(formData, 'terminationClause'),
      contractStart: new Date(contractStart).toISOString(),
      contractEnd: new Date(contractEnd).toISOString()
    })
    return { ok: true, intent, messageKey: 'createContract' }
  } catch (error) {
    return { ok: false, intent, errorKey: contractErrorKey(error) }
  }
}

export default function EditorContractsRoute({ loaderData }: Route.ComponentProps) {
  return <EditorContractsPage data={loaderData} hasError={loaderData.hasError} />
}

async function listSerializedSeries() {
  const items: SeriesListResDtoOutputItemsItem[] = []
  const limit = 100
  let offset = 0
  while (true) {
    const response = await seriesControllerListSeries({ status: 'SERIALIZED', limit, offset })
    items.push(...response.data.items)
    offset += response.data.items.length
    if (response.data.items.length < limit || offset >= response.data.total) return items
  }
}
