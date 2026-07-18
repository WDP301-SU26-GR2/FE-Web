import { boardControllerGetDecisions } from '~/api/operations/board/board'
import { contractControllerCreateDraft, contractControllerGetContracts } from '~/api/operations/contracts/contracts'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { EditorContractsPage, type EditorActionResult, type EditorContractsData } from '~/features/editor'

import type { Route } from './+types/contracts'

export function meta() {
  return [{ title: 'Contracts - MangaStudio Pro' }]
}

export async function clientLoader(): Promise<EditorContractsData & { hasError: boolean }> {
  try {
    const [contracts, series, decisions] = await Promise.all([
      contractControllerGetContracts(),
      seriesControllerListSeries({ status: 'SERIALIZED', limit: 100, offset: 0 }),
      boardControllerGetDecisions()
    ])
    return {
      contracts: contracts.data,
      series: series.data.items,
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
    await contractControllerCreateDraft({
      seriesId,
      mangakaId: required(formData, 'mangakaId'),
      boardDecisionId: required(formData, 'boardDecisionId'),
      contractType: required(formData, 'contractType') as 'FULL_BUYOUT' | 'REVENUE_SHARE',
      valuationAmount: Number(required(formData, 'valuationAmount')),
      publisherOwnershipPct: Number(required(formData, 'publisherOwnershipPct')),
      mangakaOwnershipPct: Number(required(formData, 'mangakaOwnershipPct')),
      terminationClause: required(formData, 'terminationClause'),
      contractStart: new Date(required(formData, 'contractStart')).toISOString(),
      contractEnd: new Date(required(formData, 'contractEnd')).toISOString()
    })
    return { ok: true, intent, messageKey: 'createContract' }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function EditorContractsRoute({ loaderData }: Route.ComponentProps) {
  return <EditorContractsPage data={loaderData} hasError={loaderData.hasError} />
}

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '')
  if (!value) throw new Error(`Missing ${key}`)
  return value
}
