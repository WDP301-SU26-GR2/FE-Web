import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { StoryboardResDtoOutput } from '~/api/model/storyboards'
import {
  chapterStoryboardControllerAddPage,
  chapterStoryboardControllerUpdatePages
} from '~/api/operations/storyboards/storyboards'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export type NamePageInput = {
  pageNumber: number
  fileUrl: string
}

type UseUpdateNamePagesResult = {
  updatePages: (input: {
    chapterId: string
    nameId: string
    pages: NamePageInput[]
  }) => Promise<StoryboardResDtoOutput | null>
  addPage: (input: { chapterId: string; nameId: string; page: NamePageInput }) => Promise<StoryboardResDtoOutput | null>
  isUpdating: boolean
}

/**
 * Hook for "Edit Name pages" — chapter-scoped
 * `PUT /chapters/:id/names/:nameId/pages` (`chapterNameControllerUpdatePages`).
 *
 * IMPORTANT: do NOT use `nameControllerUpdatePages` — that Orval client hits
 * the series-scoped route (`/series/:id/names/:nameId/pages`) reserved for
 * proposal-Name flow. The Publication Workbench operates on chapter-Name, so
 * we MUST go through `chapterNameController*`.
 *
 * Replaces the whole page list (only valid while DRAFT/REVISION).
 */
export function useUpdateNamePages(): UseUpdateNamePagesResult {
  const { t } = useTranslation('mangaka')
  const [isUpdating, setIsUpdating] = useState(false)

  const updatePages = useCallback(
    async (input: { chapterId: string; nameId: string; pages: NamePageInput[] }) => {
      setIsUpdating(true)
      try {
        const res = await chapterStoryboardControllerUpdatePages(
          { id: input.chapterId, storyboardId: input.nameId },
          {
            pages: input.pages.map((p) => ({
              pageNumber: p.pageNumber,
              fileUrl: p.fileUrl
            }))
          }
        )
        toast.success(t('publication.nameSection.edit.success'))
        return res.data as StoryboardResDtoOutput
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('publication.error.generic')))
        return null
      } finally {
        setIsUpdating(false)
      }
    },
    [t]
  )

  const addPage = useCallback(
    async (input: { chapterId: string; nameId: string; page: NamePageInput }) => {
      setIsUpdating(true)
      try {
        const res = await chapterStoryboardControllerAddPage(
          { id: input.chapterId, storyboardId: input.nameId },
          input.page
        )
        toast.success(t('publication.nameSection.edit.success'))
        return res.data as StoryboardResDtoOutput
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('publication.error.generic')))
        return null
      } finally {
        setIsUpdating(false)
      }
    },
    [t]
  )

  return { updatePages, addPage, isUpdating }
}
