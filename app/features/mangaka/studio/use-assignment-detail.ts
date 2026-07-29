import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AssignmentResDtoOutput } from '~/api/model/studio'
import { studioControllerGetAssignment } from '~/api/operations/studio/studio'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export interface UseMangakaAssignmentDetailResult {
  assignment: AssignmentResDtoOutput | null
  isLoading: boolean
  error: string | null
}

/** Fetches list-omitted assignment data only after its Studio card is expanded. */
export function useMangakaAssignmentDetail(assignmentId: string, enabled: boolean): UseMangakaAssignmentDetailResult {
  const { t } = useTranslation('mangaka')
  const [assignment, setAssignment] = useState<AssignmentResDtoOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || assignment) return
    const controller = new AbortController()
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        setIsLoading(true)
        setError(null)
      }
    })
    void studioControllerGetAssignment({ id: assignmentId }, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setAssignment(response.data ?? null)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setError(extractApiErrorMessage(error, t('myStudio.details.loadFailed')))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [assignment, assignmentId, enabled, t])

  return { assignment, isLoading, error }
}
