import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  chapterControllerMarkCompositeReady,
  chapterControllerResubmit,
  chapterControllerSubmit
} from '~/api/operations/chapters/chapters'
import type { ChapterResDtoOutput } from '~/api/model/chapters'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type ManuscriptAction = 'markCompositeReady' | 'submit' | 'resubmit'

export function useManuscriptActions() {
  const { t } = useTranslation('mangaka')
  const [activeAction, setActiveAction] = useState<ManuscriptAction | null>(null)

  const run = useCallback(
    async (action: ManuscriptAction, chapterId: string): Promise<ChapterResDtoOutput | null> => {
      setActiveAction(action)
      try {
        const res =
          action === 'markCompositeReady'
            ? await chapterControllerMarkCompositeReady({ id: chapterId })
            : action === 'submit'
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
