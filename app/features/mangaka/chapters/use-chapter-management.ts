import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { UpdateChapterBodyDto } from '~/api/model/chapters'
import { chapterControllerRemove, chapterControllerUpdate } from '~/api/operations/chapters/chapters'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type ChapterManagementAction = 'update' | 'remove' | null

type UseChapterManagementResult = {
  activeAction: ChapterManagementAction
  updateChapter: (chapterId: string, update: UpdateChapterBodyDto) => Promise<boolean>
  removeChapter: (chapterId: string) => Promise<boolean>
}

function readableError(error: unknown, fallback: string): string {
  const message = extractApiErrorMessage(error, fallback)
  return message.startsWith('Error.') ? fallback : message
}

/**
 * Owns the two mutable chapter-list operations exposed to a Mangaka:
 * PATCH /chapters/:id and DELETE /chapters/:id. UI gates are deliberately
 * duplicated by the server; this hook only prevents overlapping client calls
 * and never tries to emulate the backend state machine.
 */
export function useChapterManagement(): UseChapterManagementResult {
  const { t } = useTranslation('mangaka')
  const [activeAction, setActiveAction] = useState<ChapterManagementAction>(null)
  const inFlightRef = useRef(false)

  const updateChapter = useCallback(
    async (chapterId: string, update: UpdateChapterBodyDto) => {
      if (!chapterId || Object.keys(update).length === 0 || inFlightRef.current) return false

      inFlightRef.current = true
      setActiveAction('update')
      try {
        await chapterControllerUpdate({ id: chapterId }, update)
        toast.success(t('seriesDetail.publication.manage.edit.success'))
        return true
      } catch (error) {
        toast.error(readableError(error, t('seriesDetail.publication.manage.edit.error')))
        return false
      } finally {
        inFlightRef.current = false
        setActiveAction(null)
      }
    },
    [t]
  )

  const removeChapter = useCallback(
    async (chapterId: string) => {
      if (!chapterId || inFlightRef.current) return false

      inFlightRef.current = true
      setActiveAction('remove')
      try {
        await chapterControllerRemove({ id: chapterId })
        toast.success(t('seriesDetail.publication.manage.delete.success'))
        return true
      } catch (error) {
        toast.error(readableError(error, t('seriesDetail.publication.manage.delete.error')))
        return false
      } finally {
        inFlightRef.current = false
        setActiveAction(null)
      }
    },
    [t]
  )

  return { activeAction, updateChapter, removeChapter }
}
