import { useState } from 'react'

import type { AssignmentListResDtoOutputItemsItem } from '~/api/model/studio'
import { AssignmentCard } from '~/features/mangaka/assistants/components/assignment-card'
import { useMangakaAssignmentDetail } from '../use-assignment-detail'

export interface StudioAssignmentCardProps {
  assignment: AssignmentListResDtoOutputItemsItem
  onAssignClick: (assignment: AssignmentListResDtoOutputItemsItem) => void
  onTerminateClick: (assignment: AssignmentListResDtoOutputItemsItem) => void
  onReviewClick: (assignment: AssignmentListResDtoOutputItemsItem) => void
  reviewed: boolean
  reviewEligibilityKnown: boolean
}

/** Adds the on-demand API detail flow to the reusable assignment summary card. */
export function StudioAssignmentCard({
  assignment,
  onAssignClick,
  onTerminateClick,
  onReviewClick,
  reviewed,
  reviewEligibilityKnown
}: StudioAssignmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const detail = useMangakaAssignmentDetail(assignment.id, isExpanded)

  return (
    <AssignmentCard
      assignment={assignment}
      taskTypes={isExpanded ? detail.assignment?.assignedTaskTypes : undefined}
      terminatedReason={isExpanded ? detail.assignment?.terminatedReason : undefined}
      onDetailsClick={() => setIsExpanded((value) => !value)}
      isDetailsOpen={isExpanded}
      isDetailsLoading={detail.isLoading}
      detailError={isExpanded ? detail.error : null}
      onAssignClick={onAssignClick}
      onTerminateClick={onTerminateClick}
      onReviewClick={onReviewClick}
      reviewed={reviewed}
      reviewEligibilityKnown={reviewEligibilityKnown}
    />
  )
}
