import type { PaymentControllerGetPaymentsParams } from '~/api/model/payments'

const STATUSES = ['TRIGGERED', 'MISSED', 'PENDING', 'APPROVED', 'PAID', 'FAILED', 'CANCELLED'] as const
const TYPES = [
  'CONDITION_PAYOUT',
  'REVENUE_SHARE',
  'COMPENSATION',
  'CHAPTER_MILESTONE',
  'RECURRING_CHAPTER',
  'RANKING_MILESTONE',
  'TIME_BOUND',
  'TRANSFER'
] as const
const SOURCES = ['CONTRACT', 'REPRINT', 'TRANSFER', 'TERMINATION', 'MANUAL'] as const

export function paymentQuery(request: Request): PaymentControllerGetPaymentsParams {
  const search = new URL(request.url).searchParams
  return {
    status: enumValue(search.get('status'), STATUSES),
    paymentType: enumValue(search.get('paymentType'), TYPES),
    paymentSource: enumValue(search.get('paymentSource'), SOURCES),
    receiverId: text(search.get('receiverId')),
    seriesId: text(search.get('seriesId')),
    contractId: text(search.get('contractId'))
  }
}

function enumValue<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return value && allowed.includes(value as T) ? (value as T) : undefined
}

function text(value: string | null) {
  return value?.trim() || undefined
}
