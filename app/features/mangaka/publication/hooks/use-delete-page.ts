import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { chapterControllerDeletePage } from '~/api/operations/chapters/chapters'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export function useDeletePage() {
  const { t } = useTranslation('mangaka')
  const [isDeleting, setIsDeleting] = useState(false)

  const deletePage = useCallback(
    async (pageId: string) => {
      setIsDeleting(true)
      try {
        const response = await chapterControllerDeletePage({ pageId })
        toast.success(
          t('publication.pagesReader.delete.success', {
            regions: response.data.deletedRegions,
            tasks: response.data.deletedTasks
          })
        )
        return true
      } catch (error) {
        toast.error(extractApiErrorMessage(error, t('publication.pagesReader.delete.error')))
        return false
      } finally {
        setIsDeleting(false)
      }
    },
    [t]
  )

  return { deletePage, isDeleting }
}
