import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { ChapterResDtoOutput } from '~/api/model/chapters'
import type { NameResDtoOutput } from '~/api/model/names'
import {
  chapterControllerMarkCompositeReady,
  chapterControllerResubmit,
  chapterControllerSubmit
} from '~/api/operations/chapters/chapters'
import { chapterNameControllerSubmit } from '~/api/operations/names/names'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

export type ManuscriptAction = 'mark-composite-ready' | 'submit' | 'resubmit'

export function useSubmitChapterName() {
  const { t } = useTranslation('mangaka')
  const [isSubmittingName, setIsSubmittingName] = useState(false)

  const submitName = useCallback(
    async (input: { chapterId: string; nameId: string }): Promise<NameResDtoOutput | null> => {
      setIsSubmittingName(true)
      try {
        const res = await chapterNameControllerSubmit({ id: input.chapterId, nameId: input.nameId })
        toast.success(t('publication.nameSection.submit.success', { defaultValue: 'Đã nộp Name cho Editor.' }))
        return res.data as NameResDtoOutput
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('publication.error.generic')))
        return null
      } finally {
        setIsSubmittingName(false)
      }
    },
    [t]
  )

  return { submitName, isSubmittingName }
}

export function useManuscriptActions() {
  const { t } = useTranslation('mangaka')
  const [pendingAction, setPendingAction] = useState<ManuscriptAction | null>(null)

  const runAction = useCallback(
    async (chapterId: string, action: ManuscriptAction): Promise<ChapterResDtoOutput | null> => {
      setPendingAction(action)
      try {
        const res =
          action === 'mark-composite-ready'
            ? await chapterControllerMarkCompositeReady({ id: chapterId })
            : action === 'submit'
              ? await chapterControllerSubmit({ id: chapterId })
              : await chapterControllerResubmit({ id: chapterId })

        const message =
          action === 'mark-composite-ready'
            ? 'Đã chuyển bản thảo sang duyệt tổng hợp.'
            : action === 'submit'
              ? 'Đã nộp bản thảo cho Editor.'
              : 'Đã nộp lại bản thảo cho Editor.'
        toast.success(t(`publication.manuscript.actions.${action}.success`, { defaultValue: message }))
        return res.data as ChapterResDtoOutput
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('publication.error.generic')))
        return null
      } finally {
        setPendingAction(null)
      }
    },
    [t]
  )

  return { runAction, pendingAction }
}
