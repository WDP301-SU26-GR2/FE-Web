import {
  contractAmendmentControllerGetAmendment,
  contractControllerCheckStatus,
  contractControllerGetContractById
} from '~/api/operations/contracts/contracts'
import type { AmendmentListItemDtoOutput, AmendmentResDtoOutput } from '~/api/model/contracts'
import { CONTRACT_FIELD_LIMITS } from '~/features/editor'
import { extractApiErrorCode } from '~/shared/lib/api/extract-api-error'
import { mapWithConcurrency } from '~/shared/lib/api/map-with-concurrency'

const DETAIL_REQUEST_CONCURRENCY = 6

export async function loadContractBase(id: string) {
  const [contract, progress] = await Promise.all([
    contractControllerGetContractById({ id }),
    contractControllerCheckStatus({ id }).catch(() => null)
  ])
  if (contract.status !== 200) throw new Response('Contract not found', { status: contract.status })
  return { contract: contract.data, progress: progress?.status === 200 ? progress.data : null }
}

export async function hydrateAmendments(contractId: string, items: AmendmentListItemDtoOutput[]) {
  const details = await mapWithConcurrency(items, DETAIL_REQUEST_CONCURRENCY, async (item) => {
    const response = await contractAmendmentControllerGetAmendment({ contractId, id: item.id }).catch(() => null)
    return response?.status === 200 ? response.data : null
  })
  return details.filter((item): item is AmendmentResDtoOutput => item != null)
}

export function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '')
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export function paymentThreshold(form: FormData) {
  const type = required(form, 'conditionType')
  if (type === 'CHAPTER_MILESTONE')
    return { chapter: boundedInteger(form, 'chapter', 1, CONTRACT_FIELD_LIMITS.chapterMaximum) }
  if (type === 'RECURRING_CHAPTER')
    return { every: boundedInteger(form, 'every', 1, CONTRACT_FIELD_LIMITS.chapterMaximum) }
  if (type === 'RANKING_MILESTONE')
    return { topRank: boundedInteger(form, 'topRank', 1, CONTRACT_FIELD_LIMITS.rankingMaximum) }
  if (type === 'TIME_BOUND') return { deadline: required(form, 'deadline') }
  throw new Error('Invalid condition type')
}

export function paymentPayout(form: FormData) {
  const payoutAmount = optionalNumber(form, 'payoutAmount')
  const payoutPct = optionalNumber(form, 'payoutPct')
  if ((payoutAmount == null) === (payoutPct == null)) throw new Error('PAYOUT_VALUE_REQUIRED')
  if (
    (payoutAmount != null &&
      (!Number.isSafeInteger(payoutAmount) ||
        payoutAmount < CONTRACT_FIELD_LIMITS.moneyMinimum ||
        payoutAmount > CONTRACT_FIELD_LIMITS.moneyMaximum)) ||
    (payoutPct != null && (!Number.isInteger(payoutPct) || payoutPct < 1 || payoutPct > 100))
  )
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
  if (!Number.isInteger(publisher) || !Number.isInteger(mangaka) || publisher + mangaka !== 100) return false
  if (contractType === 'FULL_BUYOUT') return publisher === 100 && mangaka === 0
  return publisher > 0 && publisher < 100 && mangaka > 0 && mangaka < 100
}

function boundedInteger(form: FormData, key: string, minimum: number, maximum: number) {
  const value = Number(required(form, key))
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error('PAYOUT_VALUE_REQUIRED')
  return value
}

export function contractErrorKey(error: unknown) {
  const code = extractApiErrorCode(error)
  const localCode = error instanceof Error ? error.message : ''

  if (code === 'Error.SeriesNotSerialized') return 'seriesNotSerialized'
  if (code === 'Error.ContractNotFound') return 'contractNotFound'
  if (code === 'Error.ContractAccessDenied') return 'contractAccessDenied'
  if (code === 'Error.NotAssignedContractEditor') return 'notAssignedContractEditor'
  if (code === 'Error.InvalidContractMoney') return 'invalidContractMoney'
  if (code === 'Error.InvalidContractTransition') return 'invalidContractTransition'
  if (code === 'Error.ContractNotAmendable') return 'contractNotAmendable'
  if (code === 'Error.OpenAmendmentExists') return 'openAmendmentExists'
  if (code === 'Error.OwnershipMismatch') return 'ownershipMismatch'
  if (code === 'Error.AmendmentNoChanges') return 'amendmentNoChanges'
  if (code?.startsWith('Error.AmendmentNot')) return 'invalidState'
  if (code === 'Error.RevenueNotApplicable') return 'revenueNotApplicable'
  if (localCode === 'PAYOUT_VALUE_REQUIRED') return 'payoutRequired'
  if (localCode === 'PAYMENT_CONDITION_LOCKED') return 'paymentConditionLocked'
  return 'actionFailed'
}

export function toLocalDateTime(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
