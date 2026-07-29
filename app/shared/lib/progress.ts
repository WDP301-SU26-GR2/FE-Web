export function ratioToPercent(value: number): number {
  if (!Number.isFinite(value)) return 0

  return Math.round(Math.min(1, Math.max(0, value)) * 100)
}
