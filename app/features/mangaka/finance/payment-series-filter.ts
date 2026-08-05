export function resolveSelectedPaymentSeriesId(
  requestedSeriesId: string | null,
  availableSeriesIds: readonly string[]
): string | undefined {
  return requestedSeriesId && availableSeriesIds.includes(requestedSeriesId) ? requestedSeriesId : undefined
}
