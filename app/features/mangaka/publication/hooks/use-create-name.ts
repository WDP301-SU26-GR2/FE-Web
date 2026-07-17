import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { chapterNameControllerCreate } from '~/api/operations/names/names'
import type { NameResDtoOutput } from '~/api/model/names'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export type NamePageInput = {
  pageNumber: number
  /** R2 object key produced by `uploadToR2`. */
  fileUrl: string
}

type UseCreateNameResult = {
  /** Fire `POST /chapters/:id/names`. Returns the new Name on success, null on failure. */
  createName: (input: { chapterId: string; pages: NamePageInput[] }) => Promise<NameResDtoOutput | null>
  isCreating: boolean
}

/**
 * Hook for the "Create Name" action (Mangaka, publication phase).
 *
 * Per §5 of FE-API-Guide-v3, the endpoint requires chapter in DRAFT + no
 * existing Name. BE auto-derives `chapterNumber` from chapter id; FE only
 * sends the `namePages[]` array (each with `pageNumber` + `fileUrl` already
 * uploaded to R2).
 */
export function useCreateName(): UseCreateNameResult {
  const { t } = useTranslation('mangaka')
  const [isCreating, setIsCreating] = useState(false)

  const createName = useCallback(
    async (input: { chapterId: string; pages: NamePageInput[] }) => {
      if (!input.chapterId || input.pages.length === 0) return null
      setIsCreating(true)
      try {
        const res = await chapterNameControllerCreate(
          { id: input.chapterId },
          {
            namePages: input.pages.map((p) => ({
              pageNumber: p.pageNumber,
              fileUrl: p.fileUrl
            }))
          }
        )
        const created = res.data as NameResDtoOutput
        toast.success(t('publication.nameSection.create.success'))
        return created
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('publication.error.generic')))
        return null
      } finally {
        setIsCreating(false)
      }
    },
    [t]
  )

  return { createName, isCreating }
}
