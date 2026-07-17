import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { chapterNameControllerRemove, chapterNameControllerSubmit } from '~/api/operations/names/names'
import type { NameResDtoOutput } from '~/api/model/names'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type NameActionInput = { chapterId: string; nameId: string }

export function useNameActions() {
  const { t } = useTranslation('mangaka')
  const [activeAction, setActiveAction] = useState<'submit' | 'remove' | null>(null)

  const submit = useCallback(
    async (input: NameActionInput): Promise<NameResDtoOutput | null> => {
      setActiveAction('submit')
      try {
        const res = await chapterNameControllerSubmit({ id: input.chapterId, nameId: input.nameId })
        toast.success(t('publication.nameSection.submit.success'))
        return res.data as NameResDtoOutput
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
        await chapterNameControllerRemove({ id: input.chapterId, nameId: input.nameId })
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
