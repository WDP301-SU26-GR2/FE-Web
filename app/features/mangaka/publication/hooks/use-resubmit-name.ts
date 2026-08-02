import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { StoryboardResDtoOutput } from '~/api/model/storyboards'
import { chapterStoryboardControllerResubmit } from '~/api/operations/storyboards/storyboards'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type UseResubmitNameResult = {
  resubmit: (input: { chapterId: string; nameId: string }) => Promise<StoryboardResDtoOutput | null>
  isResubmitting: boolean
}

/**
 * Hook for "Resubmit Name for review" — `POST /chapters/:id/names/:nameId/resubmit`
 * (chapter-scoped; `chapterNameControllerResubmit`).
 *
 * IMPORTANT: do NOT use `nameControllerResubmit` here — that Orval client
 * targets `/series/:id/names/:nameId/resubmit` (proposal-Name flow only).
 * With a chapter id it would 404 on the BE.
 *
 * BE moves the Name back to IN_REVIEW and increments `version`.
 */
export function useResubmitName(): UseResubmitNameResult {
  const { t } = useTranslation('mangaka')
  const [isResubmitting, setIsResubmitting] = useState(false)

  const resubmit = useCallback(
    async (input: { chapterId: string; nameId: string }) => {
      setIsResubmitting(true)
      try {
        const res = await chapterStoryboardControllerResubmit({
          id: input.chapterId,
          storyboardId: input.nameId
        })
        toast.success(t('publication.nameSection.resubmit.success'))
        return res.data as StoryboardResDtoOutput
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('publication.error.generic')))
        return null
      } finally {
        setIsResubmitting(false)
      }
    },
    [t]
  )

  return { resubmit, isResubmitting }
}
