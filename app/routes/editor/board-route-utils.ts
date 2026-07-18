import { seriesControllerListSeries } from '~/api/operations/series/series'

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
