import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { ChapterReasonBodyDto, ChapterResDtoOutput } from '~/api/model/chapters'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { chapterControllerCoOwnerApprove, chapterControllerCoOwnerReject } from '~/api/operations/chapters/chapters'
import { extractApiErrorCode, extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type CoOwnerAction = 'approve' | 'reject'

/** Co-owner-only state transition for a PARTIAL_TRANSFER manuscript. */
export function useCoOwnerApprovalActions() {
  const { t } = useTranslation('mangaka')
  const [activeAction, setActiveAction] = useState<CoOwnerAction | null>(null)
  const activeActionRef = useRef<CoOwnerAction | null>(null)

  const run = useCallback(
    async (action: CoOwnerAction, chapterId: string, reason?: string): Promise<ChapterResDtoOutput | null> => {
      if (activeActionRef.current) return null

      activeActionRef.current = action
      setActiveAction(action)
      try {
        const response =
          action === 'approve'
            ? await chapterControllerCoOwnerApprove({ id: chapterId })
            : await chapterControllerCoOwnerReject(
                { id: chapterId },
                reason?.trim() ? ({ reason: reason.trim() } satisfies ChapterReasonBodyDto) : {}
              )
        toast.success(t(`publication.manuscript.coOwner.actions.${action}.success`))
        return response.data as ChapterResDtoOutput
      } catch (error: unknown) {
        const code = extractApiErrorCode(error)
        if (isFetchError(error) && error.status === 403) {
          toast.error(t('publication.manuscript.coOwner.errors.notCoOwner'))
        } else if (isFetchError(error) && error.status === 404) {
          toast.error(t('publication.manuscript.coOwner.errors.notAvailable'))
        } else if (
          code === 'Error.CoOwnerApprovalNotPending' ||
          code === 'Error.InvalidManuscriptTransition' ||
          (isFetchError(error) && error.status === 409)
        ) {
          toast.error(t('publication.manuscript.coOwner.errors.noLongerPending'))
        } else {
          const message = extractApiErrorMessage(error, t('publication.manuscript.coOwner.errors.generic')).trim()
          toast.error(message.startsWith('Error.') ? t('publication.manuscript.coOwner.errors.generic') : message)
        }
        return null
      } finally {
        activeActionRef.current = null
        setActiveAction(null)
      }
    },
    [t]
  )

  return { activeAction, run }
}
