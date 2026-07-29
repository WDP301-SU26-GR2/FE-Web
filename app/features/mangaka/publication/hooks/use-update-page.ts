import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { chapterControllerUpdatePage } from '~/api/operations/chapters/chapters'
import type { PageResDtoOutput, UpdatePageBodyDto } from '~/api/model/chapters'
import { extractApiErrorCode, extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

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
        toast.success(t('publication.pagesReader.updatePageNumber.success'))
        return res.data as PageResDtoOutput
      } catch (err) {
        const code = extractApiErrorCode(err)
        const fallback =
          code === 'Error.DuplicatePageNumber' || code === 'Error.PageNumberDuplicate'
            ? t('publication.pagesReader.updatePageNumber.errorDuplicate')
            : t('publication.pagesReader.updatePageNumber.errorGeneric')
        toast.error(extractApiErrorMessage(err, fallback))
        return null
      } finally {
        setIsUpdating(false)
      }
    },
    [t]
  )

  return { updatePage, isUpdating }
}
