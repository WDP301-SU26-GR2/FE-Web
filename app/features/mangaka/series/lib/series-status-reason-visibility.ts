export function shouldShowSeriesStatusReason(
  status: string | null | undefined,
  statusReason: string | null | undefined
): boolean {
  return status === 'ABANDONED' && Boolean(statusReason)
}
