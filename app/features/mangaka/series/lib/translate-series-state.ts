type Translate = (key: string) => string

const SERIES_STATUS_KEYS: Record<string, string> = {
  DRAFT: 'mySeries.statuses.DRAFT',
  IN_REVIEW: 'mySeries.statuses.IN_REVIEW',
  READY_TO_PITCH: 'mySeries.statuses.READY_TO_PITCH',
  PITCHED: 'mySeries.statuses.PITCHED',
  SERIALIZED: 'mySeries.statuses.SERIALIZED',
  HIATUS: 'mySeries.statuses.HIATUS',
  COMPLETING: 'mySeries.statuses.COMPLETING',
  CANCELLING: 'mySeries.statuses.CANCELLING',
  COMPLETED: 'mySeries.statuses.COMPLETED',
  CANCELLED: 'mySeries.statuses.CANCELLED',
  REJECTED: 'mySeries.statuses.REJECTED',
  ABANDONED: 'mySeries.statuses.ABANDONED',
  WITHDRAWN: 'mySeries.statuses.WITHDRAWN'
}

const PROPOSAL_STATUS_KEYS: Record<string, string> = {
  DRAFT: 'seriesDetail.proposalStatus.DRAFT',
  PROPOSAL_REVIEW: 'seriesDetail.proposalStatus.PROPOSAL_REVIEW',
  PROPOSAL_REVISION: 'seriesDetail.proposalStatus.PROPOSAL_REVISION',
  PROPOSAL_APPROVED: 'seriesDetail.proposalStatus.PROPOSAL_APPROVED',
  PITCHED: 'seriesDetail.proposalStatus.PITCHED',
  APPROVED: 'seriesDetail.proposalStatus.APPROVED',
  REJECTED: 'seriesDetail.proposalStatus.REJECTED',
  WITHDRAWN: 'seriesDetail.proposalStatus.WITHDRAWN'
}

const NAME_STATUS_KEYS: Record<string, string> = {
  DRAFT: 'seriesDetail.storyboardStatus.DRAFT',
  SUBMITTED: 'seriesDetail.storyboardStatus.SUBMITTED',
  IN_REVIEW: 'seriesDetail.storyboardStatus.IN_REVIEW',
  REVISION: 'seriesDetail.storyboardStatus.REVISION',
  APPROVED: 'seriesDetail.storyboardStatus.APPROVED'
}

export function translateSeriesStatus(status: string | null | undefined, t: Translate): string {
  return t(SERIES_STATUS_KEYS[status ?? ''] ?? 'state.unknown')
}

export function translateProposalStatus(status: string | null | undefined, t: Translate): string {
  return t(PROPOSAL_STATUS_KEYS[status ?? ''] ?? 'state.unknown')
}

export function translateNameStatus(status: string | null | undefined, t: Translate): string {
  return t(NAME_STATUS_KEYS[status ?? ''] ?? 'state.unknown')
}
