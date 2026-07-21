import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { chapterControllerResubmit, chapterControllerSubmit } from '~/api/operations/chapters/chapters'
import type { ChapterResDtoOutput } from '~/api/model/chapters'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type ManuscriptAction = 'submit' | 'resubmit'

/**
 * Manuscript actions for the Mangaka workbench.
 *
 * Per FE-API-Guide-v3 §5:
 *   - `submit`    → POST /chapters/{id}/manuscript/submit
 *                   Manuscript moves IN_PRODUCTION/DRAFT → EDITOR_REVIEW
 *   - `resubmit`  → POST /chapters/{id}/manuscript/resubmit
 *                   EDITOR_REVISION → EDITOR_REVIEW (sau khi sửa theo yêu cầu)
 *
 * NOTE: Ở spec v3, endpoint `markCompositeReady` đã bị xoá (BE cũ có
 * COMPOSITE_REVIEW trung gian). Flow mới đi thẳng từ IN_PRODUCTION sang
 * EDITOR_REVIEW khi tất cả pages đã COMPLETED.
 */
export function useManuscriptActions() {
  const { t } = useTranslation('mangaka')
  const [activeAction, setActiveAction] = useState<ManuscriptAction | null>(null)

  const run = useCallback(
    async (action: ManuscriptAction, chapterId: string): Promise<ChapterResDtoOutput | null> => {
      setActiveAction(action)
      try {
        const res =
          action === 'submit'
            ? await chapterControllerSubmit({ id: chapterId })
            : await chapterControllerResubmit({ id: chapterId })
        toast.success(t(`publication.manuscript.actions.${action}.success`))
        return res.data as ChapterResDtoOutput
      } catch (error) {
        toast.error(extractApiErrorMessage(error, t(`publication.manuscript.actions.${action}.error`)))
        return null
      } finally {
        setActiveAction(null)
      }
    },
    [t]
  )

  return { run, activeAction }
}
