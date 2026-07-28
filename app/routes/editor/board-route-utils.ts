import { seriesControllerListSeries } from '~/api/operations/series/series'
import { boardControllerGetDecisionDetails, boardControllerGetSessionById } from '~/api/operations/board/board'
import type {
  BoardDecisionListItemDtoOutput,
  BoardDecisionResDtoOutput,
  BoardSessionListItemDtoOutput,
  BoardSessionResDtoOutput
} from '~/api/model/board'

export function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export function optionalDate(form: FormData, key: string) {
  const value = String(form.get(key) ?? '')
  return value ? new Date(value).toISOString() : undefined
}

export async function loadBoardLifecycleSeries() {
  const statuses = ['SERIALIZED', 'HIATUS', 'COMPLETING', 'CANCELLING'] as const
  const responses = await Promise.all(
    statuses.map((status) => seriesControllerListSeries({ status, limit: 100, offset: 0 }))
  )
  return responses.flatMap((response) => response.data.items)
}

export async function loadBoardSessionSeries() {
  const statuses = ['READY_TO_PITCH', 'PITCHED', 'SERIALIZED'] as const
  const responses = await Promise.all(
    statuses.map((status) => seriesControllerListSeries({ status, limit: 100, offset: 0 }))
  )
  return [
    ...new Map(responses.flatMap((response) => response.data.items).map((series) => [series.id, series])).values()
  ]
}

export async function hydrateBoardSessions(items: BoardSessionListItemDtoOutput[]) {
  const details = await Promise.all(
    items.map(async (item) => {
      const response = await boardControllerGetSessionById({ id: item.id }).catch(() => null)
      return response?.status === 200 ? response.data : null
    })
  )
  return details.filter((item): item is BoardSessionResDtoOutput => item != null)
}

export async function hydrateBoardDecisions(items: BoardDecisionListItemDtoOutput[]) {
  const details = await Promise.all(
    items.map(async (item) => {
      const response = await boardControllerGetDecisionDetails({ id: item.id }).catch(() => null)
      return response?.status === 200 ? response.data : null
    })
  )
  return details.filter((item): item is BoardDecisionResDtoOutput => item != null)
}
