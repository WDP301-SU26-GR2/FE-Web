import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { nameControllerAddPage, nameControllerUpdatePages } from '~/api/operations/names/names'
import type { AddNamePageBodyDto, NameResDtoOutput, UpdateNamePagesBodyDto } from '~/api/model/names'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type UseUpdateProposalNameResult = {
  updatePages: (
    seriesId: string,
    nameId: string,
    pages: UpdateNamePagesBodyDto['pages']
  ) => Promise<NameResDtoOutput | null>
  addPage: (seriesId: string, nameId: string, page: AddNamePageBodyDto) => Promise<NameResDtoOutput | null>
  isUpdatingName: boolean
}

/** Updates the proposal-scoped Name. Chapter Names must use chapterNameController*. */
export function useUpdateProposalName(): UseUpdateProposalNameResult {
  const { t } = useTranslation('mangaka')
  const [isUpdatingName, setIsUpdatingName] = useState(false)

  const updatePages = useCallback(
    async (seriesId: string, nameId: string, pages: UpdateNamePagesBodyDto['pages']) => {
      setIsUpdatingName(true)
      try {
        const response = await nameControllerUpdatePages({ id: seriesId, nameId }, { pages })
        toast.success(t('seriesDetail.editProposal.nameSuccess'))
        return response.data as NameResDtoOutput
      } catch (error) {
        if (isFetchError(error) && error.status === 403) {
          toast.error(t('seriesDetail.editProposal.errorPermission'))
        } else if (isFetchError(error) && error.status === 404) {
          toast.error(t('seriesDetail.editProposal.nameMissing'))
        } else if (isFetchError(error) && error.status === 409) {
          toast.error(t('seriesDetail.editProposal.nameConflict'))
        } else {
          toast.error(extractApiErrorMessage(error, t('seriesDetail.editProposal.nameErrorGeneric')))
        }
        return null
      } finally {
        setIsUpdatingName(false)
      }
    },
    [t]
  )

  const addPage = useCallback(
    async (seriesId: string, nameId: string, page: AddNamePageBodyDto) => {
      setIsUpdatingName(true)
      try {
        const response = await nameControllerAddPage({ id: seriesId, nameId }, page)
        toast.success(t('seriesDetail.editProposal.nameSuccess'))
        return response.data as NameResDtoOutput
      } catch (error) {
        toast.error(extractApiErrorMessage(error, t('seriesDetail.editProposal.nameErrorGeneric')))
        return null
      } finally {
        setIsUpdatingName(false)
      }
    },
    [t]
  )

  return { updatePages, addPage, isUpdatingName }
}
