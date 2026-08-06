import { seriesControllerListSeries } from '~/api/operations/series/series'
import { boardControllerGetDecisionDetails, boardControllerGetSessionById } from '~/api/operations/board/board'
import type {
  BoardDecisionListItemDtoOutput,
  BoardDecisionResDtoOutput,
  BoardSessionListItemDtoOutput,
  BoardSessionResDtoOutput
} from '~/api/model/board'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'
import { mapWithConcurrency } from '~/shared/lib/api/map-with-concurrency'

const DETAIL_REQUEST_CONCURRENCY = 6

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
    statuses.map((status) =>
      loadAllOffsetItems((pagination) =>
        seriesControllerListSeries({ status, ...pagination }).then((response) => response.data)
      )
    )
  )
  return responses.flat()
}

export async function loadBoardSessionSeries() {
  return loadAllOffsetItems((pagination) => seriesControllerListSeries(pagination).then((response) => response.data))
}

export async function hydrateBoardSessions(items: BoardSessionListItemDtoOutput[]) {
  const details = await mapWithConcurrency(items, DETAIL_REQUEST_CONCURRENCY, async (item) => {
    const response = await boardControllerGetSessionById({ id: item.id }).catch(() => null)
    return response?.status === 200 ? response.data : null
  })
  return details.filter((item): item is BoardSessionResDtoOutput => item != null)
}

export async function hydrateBoardDecisions(items: BoardDecisionListItemDtoOutput[]) {
  const details = await mapWithConcurrency(items, DETAIL_REQUEST_CONCURRENCY, async (item) => {
    const response = await boardControllerGetDecisionDetails({ id: item.id }).catch(() => null)
    return response?.status === 200 ? response.data : null
  })
  return details.filter((item): item is BoardDecisionResDtoOutput => item != null)
}
