export type PaymentConditionLike = {
  status: string
  payoutAmount?: number | null
  payoutPct?: number | null
}

export function hasValidPaymentCondition(conditions: PaymentConditionLike[]) {
  return conditions.some(
    (condition) =>
      condition.status !== 'DISABLED' && ((condition.payoutAmount ?? 0) > 0 || (condition.payoutPct ?? 0) > 0)
  )
}
