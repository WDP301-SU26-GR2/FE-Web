const paymentStatuses = new Set(['TRIGGERED', 'PENDING', 'APPROVED', 'PAID', 'MISSED', 'FAILED', 'CANCELLED'])
const paymentTypes = new Set([
  'CONDITION_PAYOUT',
  'REVENUE_SHARE',
  'COMPENSATION',
  'CHAPTER_MILESTONE',
  'RECURRING_CHAPTER',
  'RANKING_MILESTONE',
  'TIME_BOUND',
  'TRANSFER'
])

export function getPaymentExplanationKey(group: 'status' | 'type', value: string): string {
  const values = group === 'status' ? paymentStatuses : paymentTypes
  return values.has(value) ? `finance.${group}Description.${value}` : 'finance.explanationUnavailable'
}
