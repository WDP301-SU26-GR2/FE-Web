export function isPageSetLocked(activeStageStatus: string | undefined, outputsLocked: boolean): boolean {
  return outputsLocked || activeStageStatus !== 'ACTIVE'
}
