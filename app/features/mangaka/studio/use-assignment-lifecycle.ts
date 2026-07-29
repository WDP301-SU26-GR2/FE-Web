import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { reviewsControllerCreateAssistantReview } from '~/api/operations/reviews/reviews'
import { studioControllerTerminateAssignment } from '~/api/operations/studio/studio'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export interface UseAssignmentLifecycleResult {
  isMutating: boolean
  terminate: (assignmentId: string, reason: string) => Promise<{ success: boolean; error?: string }>
  review: (input: {
    assignmentId: string
    assistantId: string
    seriesId: string | null
    rating: number
    comment: string
  }) => Promise<{ success: boolean; error?: string }>
}

/** Mangaka-only end-of-collaboration actions from the Studio flow. */
export function useAssignmentLifecycle(): UseAssignmentLifecycleResult {
  const { t } = useTranslation('mangaka')
  const [isMutating, setIsMutating] = useState(false)

  const terminate = useCallback(
    async (assignmentId: string, reason: string) => {
      setIsMutating(true)
      try {
        await studioControllerTerminateAssignment({ id: assignmentId }, { reason })
        return { success: true }
      } catch (error) {
        return { success: false, error: extractApiErrorMessage(error, t('myStudio.lifecycle.terminateFailed')) }
      } finally {
        setIsMutating(false)
      }
    },
    [t]
  )

  const review = useCallback(
    async ({
      assignmentId,
      assistantId,
      seriesId,
      rating,
      comment
    }: Parameters<UseAssignmentLifecycleResult['review']>[0]) => {
      setIsMutating(true)
      try {
        await reviewsControllerCreateAssistantReview({
          assistantId,
          studioAssignmentId: assignmentId,
          rating,
          ...(seriesId ? { seriesId } : {}),
          ...(comment.trim() ? { comment: comment.trim() } : {})
        })
        return { success: true }
      } catch (error) {
        return { success: false, error: extractApiErrorMessage(error, t('myStudio.lifecycle.reviewFailed')) }
      } finally {
        setIsMutating(false)
      }
    },
    [t]
  )

  return { isMutating, terminate, review }
}
