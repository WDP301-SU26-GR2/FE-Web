import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { chapterControllerDeletePagesBulk } from '~/api/operations/chapters/chapters'
import type { DeletePagesBulkResDtoOutput } from '~/api/model/chapters'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type UseDeletePagesBulkResult = {
  deletePagesBulk: (chapterId: string, pageIds: string[]) => Promise<DeletePagesBulkResDtoOutput | null>
  isDeletingBulk: boolean
}

/**
 * Hook for "Delete pages bulk" — `DELETE /chapters/:id/pages` (all-or-nothing, max 50).
 *
 * - Backend validates ALL pageIds first; if any fails (not found / wrong chapter /
 *   COMPLETED / has APPROVED tasks) → NO pages are deleted.
 * - Shows count of cascade-deleted regions and tasks.
 */
export function useDeletePagesBulk(): UseDeletePagesBulkResult {
  const { t } = useTranslation('mangaka')
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)

  const deletePagesBulk = useCallback(
    async (chapterId: string, pageIds: string[]) => {
      setIsDeletingBulk(true)
      try {
        const res = await chapterControllerDeletePagesBulk({ id: chapterId }, { pageIds })
        const data = res.data as DeletePagesBulkResDtoOutput
        toast.success(
          t('publication.pagesReader.deleteBulk.success', {
            pages: data.deletedPages,
            regions: data.deletedRegions,
            tasks: data.deletedTasks
          })
        )
        return data
      } catch (err) {
        const code = (err as { code?: string }).code
        if (code === 'Error.PageNotEditable') {
          toast.error(t('publication.pagesReader.deleteBulk.errorPageNotEditable'))
        } else if (code === 'Error.PageHasApprovedTasks') {
          toast.error(t('publication.pagesReader.deleteBulk.errorHasApprovedTasks'))
        } else if (code === 'Error.PageNotFound') {
          toast.error(t('publication.pagesReader.deleteBulk.errorPageNotFound'))
        } else if (code === 'Error.ChapterOnHold') {
          toast.error(t('publication.pagesReader.deleteBulk.errorChapterOnHold'))
        } else if (code === 'Error.ChapterAccessDenied') {
          toast.error(t('publication.pagesReader.deleteBulk.errorAccessDenied'))
        } else {
          toast.error(extractApiErrorMessage(err, t('publication.error.generic')))
        }
        return null
      } finally {
        setIsDeletingBulk(false)
      }
    },
    [t]
  )

  return { deletePagesBulk, isDeletingBulk }
}
