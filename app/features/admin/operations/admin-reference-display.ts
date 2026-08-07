type ScopedSeries = {
  magazine: string | null
  publicationType: string | null
}

export function getEligibleSeriesForScope<T extends ScopedSeries>(
  items: T[],
  magazine: string,
  publicationType: string
) {
  return items.filter((item) => item.magazine === magazine && item.publicationType === publicationType)
}

export function isValidSurveyTransition(currentStatus: string, nextStatus: string) {
  return (
    (currentStatus === 'DRAFT' && nextStatus === 'OPEN') ||
    (currentStatus === 'OPEN' && nextStatus === 'CLOSED')
  )
}
