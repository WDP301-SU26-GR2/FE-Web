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

export function paymentPayout(form: FormData) {
  const payoutAmount = optionalNumber(form, 'payoutAmount')
  const payoutPct = optionalNumber(form, 'payoutPct')
  if ((payoutAmount ?? 0) <= 0 && (payoutPct ?? 0) <= 0) throw new Error('PAYOUT_VALUE_REQUIRED')
  if ((payoutAmount != null && payoutAmount < 0) || (payoutPct != null && (payoutPct < 0 || payoutPct > 100)))
    throw new Error('PAYOUT_VALUE_REQUIRED')
  return {
    ...(payoutAmount != null ? { payoutAmount } : {}),
    ...(payoutPct != null ? { payoutPct } : {})
  }
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
  const payload =
    error && typeof error === 'object' && 'data' in error
      ? (error as { data?: { code?: string; message?: string } }).data
      : undefined
  const code = payload?.code
  const message = payload?.message ?? (error instanceof Error ? error.message : '')

  if (code === 'Error.SeriesNotSerialized') return 'seriesNotSerialized'
  if (code === 'Error.InvalidContractTransition') return 'invalidContractTransition'
  if (message.includes('INVALID_CONTRACT_STATUS_FOR_THIS_ACTION')) return 'invalidContractTransition'
  if (message.includes('Trạng thái hợp đồng không phù hợp')) return 'invalidContractTransition'
  if (code === 'Error.ContractNotAmendable') return 'contractNotAmendable'
  if (code === 'Error.OpenAmendmentExists') return 'openAmendmentExists'
  if (code === 'Error.OwnershipMismatch') return 'ownershipMismatch'
  if (code === 'Error.AmendmentNoChanges') return 'amendmentNoChanges'
  if (code?.includes('PAYMENT_CONDITION_NOT_EDITABLE')) return 'invalidState'
  if (code?.startsWith('Error.AmendmentNot')) return 'invalidState'
  if (code?.includes('REVENUE_NOT_APPLICABLE')) return 'revenueNotApplicable'
  if (code?.includes('ONLY_ASSIGNED_EDITOR')) return 'notAssigned'
  if (message.includes('PAYOUT_VALUE_REQUIRED')) return 'payoutRequired'
  if (message.includes('PAYMENT_CONDITION_REQUIRED')) return 'paymentConditionRequired'
  if (message.includes('PAYMENT_CONDITION_LOCKED')) return 'paymentConditionLocked'
  return 'actionFailed'
}

export function toLocalDateTime(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
