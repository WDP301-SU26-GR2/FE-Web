import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { chapterControllerCreate } from '~/api/operations/chapters/chapters'
import type { ChapterResDtoOutput } from '~/api/model/chapters'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

export type CreateChapterInput = {
  seriesId: string
  chapterNumber: number
  title?: string
}

type UseCreateChapterResult = {
  /** Fire POST /chapters. Returns the new chapter on success, null on failure. */
  createChapter: (input: CreateChapterInput) => Promise<ChapterResDtoOutput | null>
  isCreating: boolean
}

/**
 * Hook for the Mangaka "Create new chapter" action (publication phase).
 *
 * Calls POST /chapters (orval-generated `chapterControllerCreate`).
 * BE auto-matches the latest APPROVED Name for the series to seed the
 * Manuscript (DRAFT) + Schedule, so FE only sends seriesId + chapterNumber
 * + optional title. On success surfaces a translated success toast and
 * returns the new Chapter. On failure surfaces a translated error toast
 * (BE message preferred) and returns null.
 */
export function useCreateChapter(): UseCreateChapterResult {
  const { t } = useTranslation('mangaka')
  const [isCreating, setIsCreating] = useState(false)

  const createChapter = useCallback(
    async (input: CreateChapterInput) => {
      if (!input.seriesId) return null
      setIsCreating(true)
      try {
        const response = await chapterControllerCreate({
          seriesId: input.seriesId,
          chapterNumber: input.chapterNumber,
          title: input.title
        })
        const payload = response.data as unknown as ChapterResDtoOutput
        toast.success(t('seriesDetail.publication.create.success'))
        return payload
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('seriesDetail.publication.create.errorGeneric')))
        return null
      } finally {
        setIsCreating(false)
      }
    },
    [t]
  )

  return { createChapter, isCreating }
}