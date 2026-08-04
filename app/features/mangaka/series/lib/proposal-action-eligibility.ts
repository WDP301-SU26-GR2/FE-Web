export interface ProposalActionEligibilityInput {
  isOwner: boolean
  seriesStatus: string | null | undefined
  proposalStatus: string | null | undefined
}

export interface ProposalActionEligibility {
  canSubmit: boolean
  canEdit: boolean
  canDelete: boolean
  canResubmit: boolean
  canWithdraw: boolean
  canReopen: boolean
}

const SERIES_METADATA_TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'REJECTED', 'ABANDONED', 'WITHDRAWN'])

export interface SeriesMetadataEligibilityInput {
  isOwner: boolean
  seriesStatus: string | null | undefined
  canEditProposal: boolean
}

export function canEditSeriesMetadata(input: SeriesMetadataEligibilityInput): boolean {
  return (
    input.isOwner &&
    !!input.seriesStatus &&
    !input.canEditProposal &&
    !SERIES_METADATA_TERMINAL_STATUSES.has(input.seriesStatus)
  )
}

export function getProposalActionEligibility(input: ProposalActionEligibilityInput): ProposalActionEligibility {
  const isDraft = input.seriesStatus === 'DRAFT'

  return {
    canSubmit: input.isOwner && isDraft,
    canEdit: input.isOwner && (isDraft || input.proposalStatus === 'PROPOSAL_REVISION'),
    canDelete: input.isOwner && isDraft,
    canResubmit: input.isOwner && input.proposalStatus === 'PROPOSAL_REVISION',
    canWithdraw: input.isOwner && ['IN_REVIEW', 'READY_TO_PITCH', 'REJECTED'].includes(input.seriesStatus ?? ''),
    canReopen: input.isOwner && ['ABANDONED', 'WITHDRAWN'].includes(input.seriesStatus ?? '')
  }
}
