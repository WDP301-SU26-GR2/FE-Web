import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AssignmentResDtoOutput } from '~/api/model/studio'
import { studioControllerGetAssignment } from '~/api/operations/studio/studio'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export interface UseAssignmentDetailResult {
  assignment: AssignmentResDtoOutput | null
  isLoading: boolean
  error: string | null
}

/** List results omit task types and termination reason; load them on demand. */
export function useAssignmentDetail(id: string, enabled: boolean): UseAssignmentDetailResult {
  const { t } = useTranslation('assistant')
  const [assignment, setAssignment] = useState<AssignmentResDtoOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    void (async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await studioControllerGetAssignment({ id }, { signal: controller.signal })
        if (!controller.signal.aborted) setAssignment(response.data ?? null)
      } catch (err: unknown) {
        if (!controller.signal.aborted) setError(extractApiErrorMessage(err, t('studio.error.detailFailed')))
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()
    return () => controller.abort()
  }, [enabled, id, t])

  return { assignment, isLoading, error }
}
