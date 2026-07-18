import { seriesControllerListSeries } from '~/api/operations/series/series'

export async function loadOperationalSeries() {
  const statuses = ['SERIALIZED', 'HIATUS', 'COMPLETING', 'CANCELLING'] as const
  const responses = await Promise.all(
    statuses.map((status) => seriesControllerListSeries({ status, limit: 100, offset: 0 }))
  )
  return responses.flatMap((response) => response.data.items)
}

export function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '')
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export function number(form: FormData, key: string) {
  return Number(required(form, key))
}

export function optionalNumber(form: FormData, key: string) {
  const value = String(form.get(key) ?? '')
  return value ? Number(value) : undefined
}

export function optional(form: FormData, key: string) {
  const value = String(form.get(key) ?? '')
  return value || undefined
}

export function date(form: FormData, key: string) {
  return new Date(required(form, key)).toISOString()
}
