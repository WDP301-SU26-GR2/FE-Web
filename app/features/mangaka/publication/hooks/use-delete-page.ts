import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { chapterControllerDeletePage } from '~/api/operations/chapters/chapters'
import type { DeletePageResDtoOutput } from '~/api/model/chapters'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type UseDeletePageResult = {
  deletePage: (pageId: string) => Promise<DeletePageResDtoOutput | null>
  isDeleting: boolean
}

/**
 * Hook for "Delete page" — `DELETE /pages/:pageId`.
 *
 * - Cascade deletes Region + Task of the page in one transaction.
 * - Only works when Page is `DRAFT` or `REVISING`. `COMPLETED` pages are locked.
 * - Shows confirmation dialog with task count warning (FE should call
 *   `GET /tasks?pageId=...` before showing the dialog).
 */
export function useDeletePage(): UseDeletePageResult {
  const { t } = useTranslation('mangaka')
  const [isDeleting, setIsDeleting] = useState(false)

  const deletePage = useCallback(
    async (pageId: string) => {
      setIsDeleting(true)
      try {
        const res = await chapterControllerDeletePage({ pageId })
        toast.success(t('publication.pagesReader.delete.success'))
        return res.data as DeletePageResDtoOutput
      } catch (err) {
        const code = (err as { code?: string }).code
        if (code === 'Error.PageHasApprovedTasks') {
          toast.error(t('publication.pagesReader.delete.errorHasApprovedTasks'))
        } else if (code === 'Error.PageNotEditable') {
          toast.error(t('publication.pagesReader.delete.errorPageNotEditable'))
        } else if (code === 'Error.ChapterOnHold') {
          toast.error(t('publication.pagesReader.delete.errorChapterOnHold'))
        } else {
          toast.error(extractApiErrorMessage(err, t('publication.error.generic')))
        }
        return null
      } finally {
        setIsDeleting(false)
      }
    },
    [t]
  )

  return { deletePage, isDeleting }
}
