import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { chapterControllerUpdatePage } from '~/api/operations/chapters/chapters'
import type { PageResDtoOutput, UpdatePageBodyDto } from '~/api/model/chapters'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

type UseUpdatePageResult = {
  updatePage: (input: { pageId: string; body: UpdatePageBodyDto }) => Promise<PageResDtoOutput | null>
  isUpdating: boolean
}

/**
 * Hook for "Update page" — `PATCH /pages/:pageId`.
 * Used to set `compositeFile` after Assistants finish their tasks and to
 * fall back to hand-driven PageStatus transitions.
 */
export function useUpdatePage(): UseUpdatePageResult {
  const { t } = useTranslation('mangaka')
  const [isUpdating, setIsUpdating] = useState(false)

  const updatePage = useCallback(
    async (input: { pageId: string; body: UpdatePageBodyDto }) => {
      setIsUpdating(true)
      try {
        const res = await chapterControllerUpdatePage({ pageId: input.pageId }, input.body)
        toast.success(t('publication.pagesSection.update.success'))
        return res.data as PageResDtoOutput
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('publication.error.generic')))
        return null
      } finally {
        setIsUpdating(false)
      }
    },
    [t]
  )

  return { updatePage, isUpdating }
}
