import { contractControllerCheckStatus, contractControllerGetContractById } from '~/api/operations/contracts/contracts'

export async function loadContractBase(id: string) {
  const [contract, progress] = await Promise.all([
    contractControllerGetContractById({ id }),
    contractControllerCheckStatus({ id }).catch(() => null)
  ])
  if (contract.status !== 200) throw new Response('Contract not found', { status: contract.status })
  return { contract: contract.data, progress: progress?.status === 200 ? progress.data : null }
}

export function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '')
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export function paymentThreshold(form: FormData) {
  const type = required(form, 'conditionType')
  if (type === 'CHAPTER_MILESTONE') return { chapter: Number(required(form, 'chapter')) }
  if (type === 'RECURRING_CHAPTER') return { every: Number(required(form, 'every')) }
  if (type === 'RANKING_MILESTONE') return { topRank: Number(required(form, 'topRank')) }
  if (type === 'TIME_BOUND') return { deadline: required(form, 'deadline') }
  throw new Error('Invalid condition type')
}

export function clauses(form: FormData) {
  return required(form, 'changedClauses')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function optionalText(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  return value || undefined
}

export function optionalNumber(form: FormData, key: string) {
  const value = optionalText(form, key)
  if (value == null) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ${key}`)
  return parsed
}

export function optionalDate(form: FormData, key: string) {
  const value = optionalText(form, key)
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${key}`)
  return date.toISOString()
}

export function datesAreValid(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate > startDate
}

export function ownershipIsValid(contractType: string, publisher: number, mangaka: number) {
  if (!Number.isFinite(publisher) || !Number.isFinite(mangaka) || publisher + mangaka !== 100) return false
  return contractType !== 'FULL_BUYOUT' || (publisher === 100 && mangaka === 0)
}

export function contractErrorKey(error: unknown) {
  const code =
    error && typeof error === 'object' && 'data' in error
      ? (error as { data?: { code?: string } }).data?.code
      : undefined

  if (code === 'Error.SeriesNotSerialized') return 'seriesNotSerialized'
  if (code === 'Error.InvalidContractTransition') return 'invalidContractTransition'
  if (code === 'Error.ContractNotAmendable') return 'contractNotAmendable'
  if (code === 'Error.OpenAmendmentExists') return 'openAmendmentExists'
  if (code === 'Error.OwnershipMismatch') return 'ownershipMismatch'
  if (code === 'Error.AmendmentNoChanges') return 'amendmentNoChanges'
  if (code?.includes('PAYMENT_CONDITION_NOT_EDITABLE')) return 'invalidState'
  if (code?.startsWith('Error.AmendmentNot')) return 'invalidState'
  if (code?.includes('REVENUE_NOT_APPLICABLE')) return 'revenueNotApplicable'
  if (code?.includes('ONLY_ASSIGNED_EDITOR')) return 'notAssigned'
  return 'actionFailed'
}

export function toLocalDateTime(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
