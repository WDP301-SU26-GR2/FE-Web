import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { chapterControllerCreatePage } from '~/api/operations/chapters/chapters'
import type { PageResDtoOutput } from '~/api/model/chapters'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

type UseCreatePageResult = {
  createPage: (input: { chapterId: string; pageNumber: number; originalFile: string }) => Promise<PageResDtoOutput | null>
  isCreating: boolean
}

/**
 * Hook for "Upload page" — `POST /chapters/:id/pages`.
 *
 * - Requires Name APPROVED on the chapter (BE 409 otherwise).
 * - `originalFile` is an R2 object key (the FE PUTs bytes via `uploadToR2`).
 * - The first page moves Manuscript to IN_PRODUCTION.
 */
export function useCreatePage(): UseCreatePageResult {
  const { t } = useTranslation('mangaka')
  const [isCreating, setIsCreating] = useState(false)

  const createPage = useCallback(
    async (input: { chapterId: string; pageNumber: number; originalFile: string }) => {
      setIsCreating(true)
      try {
        const res = await chapterControllerCreatePage(
          { id: input.chapterId },
          {
            pageNumber: input.pageNumber,
            originalFile: input.originalFile
          }
        )
        toast.success(t('publication.pagesSection.upload.success'))
        return res.data as PageResDtoOutput
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('publication.error.generic')))
        return null
      } finally {
        setIsCreating(false)
      }
    },
    [t]
  )

  return { createPage, isCreating }
}
