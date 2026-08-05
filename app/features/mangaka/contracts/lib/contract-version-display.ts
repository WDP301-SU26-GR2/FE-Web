type Translate = (key: string) => string

export function getContractVersionDisplay(version: { versionNumber: number; createdAt: string }): {
  versionNumber: number
  createdAt: string
} {
  return {
    versionNumber: version.versionNumber,
    createdAt: version.createdAt
  }
}

export function getAmendmentReason(
  _triggerSource: string | null | undefined,
  reason: string | null | undefined,
  t: Translate
): string | null {
  return reason ?? t('contracts.detail.amendmentFallback')
}
