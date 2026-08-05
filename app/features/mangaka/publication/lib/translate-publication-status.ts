type Translate = (key: string) => string

const STORYBOARD_STATUS_KEYS: Record<string, string> = {
  DRAFT: 'publication.storyboardStatus.DRAFT',
  SUBMITTED: 'publication.storyboardStatus.SUBMITTED',
  IN_REVIEW: 'publication.storyboardStatus.IN_REVIEW',
  REVISION: 'publication.storyboardStatus.REVISION',
  APPROVED: 'publication.storyboardStatus.APPROVED'
}

const PAGE_STATUS_KEYS: Record<string, string> = {
  DRAFT: 'publication.pageStatus.DRAFT',
  COMPLETED: 'publication.pageStatus.COMPLETED',
  REVISING: 'publication.pageStatus.REVISING'
}

const PRODUCTION_STAGE_NAME_KEYS: Record<string, string> = {
  INKING: 'seriesDetail.production.productionStage.INKING',
  DETAILING: 'seriesDetail.production.productionStage.DETAILING',
  LETTERING: 'seriesDetail.production.productionStage.LETTERING',
  FINAL_CHECK: 'seriesDetail.production.productionStage.FINAL_CHECK'
}

export function translateStoryboardStatus(status: string | null | undefined, t: Translate): string {
  return t(STORYBOARD_STATUS_KEYS[status ?? ''] ?? 'state.unknown')
}

export function translatePageStatus(status: string | null | undefined, t: Translate): string {
  return t(PAGE_STATUS_KEYS[status ?? ''] ?? 'state.unknown')
}

export function translateProductionStageName(name: string, t: Translate): string {
  const key = PRODUCTION_STAGE_NAME_KEYS[name]
  return key ? t(key) : name
}
