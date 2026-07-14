import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { chapterControllerCreate } from '~/api/operations/chapters/chapters'
import type { ChapterResDtoOutput } from '~/api/model/chapters'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

export type CreateChapterInput = {
  seriesId: string
  nameId: string
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
 * On success surfaces a translated success toast and returns the new
 * Chapter. On failure surfaces a translated error toast (BE message
 * preferred) and returns null. BE enforces that the Name must already
 * be APPROVED and the series must be SERIALIZED — UI mirrors these gates
 * but is not authoritative.
 */
export function useCreateChapter(): UseCreateChapterResult {
  const { t } = useTranslation('mangaka')
  const [isCreating, setIsCreating] = useState(false)

  const createChapter = useCallback(
    async (input: CreateChapterInput) => {
      if (!input.seriesId || !input.nameId) return null
      setIsCreating(true)
      try {
        const response = await chapterControllerCreate({
          seriesId: input.seriesId,
          nameId: input.nameId,
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
