import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { StoryboardResDtoOutput } from '~/api/model/storyboards'
import {
  chapterStoryboardControllerRemove,
  chapterStoryboardControllerSubmit
} from '~/api/operations/storyboards/storyboards'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type NameActionInput = { chapterId: string; nameId: string }

export function useNameActions() {
  const { t } = useTranslation('mangaka')
  const [activeAction, setActiveAction] = useState<'submit' | 'remove' | null>(null)

  const submit = useCallback(
    async (input: NameActionInput): Promise<StoryboardResDtoOutput | null> => {
      setActiveAction('submit')
      try {
        const res = await chapterStoryboardControllerSubmit({
          id: input.chapterId,
          storyboardId: input.nameId
        })
        toast.success(t('publication.nameSection.submit.success'))
        return res.data as StoryboardResDtoOutput
      } catch (error) {
        toast.error(extractApiErrorMessage(error, t('publication.nameSection.submit.error')))
        return null
      } finally {
        setActiveAction(null)
      }
    },
    [t]
  )

  const remove = useCallback(
    async (input: NameActionInput): Promise<boolean> => {
      setActiveAction('remove')
      try {
        await chapterStoryboardControllerRemove({
          id: input.chapterId,
          storyboardId: input.nameId
        })
        toast.success(t('publication.nameSection.remove.success'))
        return true
      } catch (error) {
        toast.error(extractApiErrorMessage(error, t('publication.nameSection.remove.error')))
        return false
      } finally {
        setActiveAction(null)
      }
    },
    [t]
  )

  return { submit, remove, activeAction }
}
