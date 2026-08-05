const TRANSFER_ELIGIBLE_SERIES_STATUSES = new Set(['SERIALIZED', 'HIATUS'])

type TransferSeriesCandidate = {
  id: string
  status: string
}

export function selectEligibleTransferSeries<T extends TransferSeriesCandidate>(
  catalog: readonly T[],
  ownedSeries: ReadonlyArray<{ id: string }>
): T[] {
  const ownedSeriesIds = new Set(ownedSeries.map((item) => item.id))
  return catalog.filter((item) => TRANSFER_ELIGIBLE_SERIES_STATUSES.has(item.status) && !ownedSeriesIds.has(item.id))
}

export function isTransferEligibleSeriesStatus(status: string): boolean {
  return TRANSFER_ELIGIBLE_SERIES_STATUSES.has(status)
}
