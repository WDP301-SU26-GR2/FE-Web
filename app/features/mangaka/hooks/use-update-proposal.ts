import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { seriesControllerUpdateProposal } from '~/api/operations/series/series'
import type { SeriesResDtoOutput, UpdateProposalBodyDto } from '~/api/model/series'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

type UseUpdateProposalResult = {
  /**
   * Fire `PUT /series/proposals/:id` with the given partial body.
   * Returns the updated Series on success, null on failure (and surfaces a toast).
   */
  update: (seriesId: string, body: UpdateProposalBodyDto) => Promise<SeriesResDtoOutput | null>
  isUpdating: boolean
}

/**
 * Hook for the Mangaka "Edit Proposal" action.
 *
 * Calls `PUT /series/proposals/:id` (orval-generated `seriesControllerUpdateProposal`)
 * per §6.1 of FE-API-Guide-v2.md. Partial-update: omit field = keep current value;
 * send `null` to clear (e.g. `coverImage: null`); send `[]` to clear an array
 * (e.g. `characterDesigns: []`). Server enforces editability (DRAFT or
 * PROPOSAL_REVISION) — we map 409 to a domain-specific toast.
 */
export function useUpdateProposal(): UseUpdateProposalResult {
  const { t } = useTranslation('mangaka')
  const [isUpdating, setIsUpdating] = useState(false)

  const update = useCallback(
    async (seriesId: string, body: UpdateProposalBodyDto) => {
      if (!seriesId) return null
      setIsUpdating(true)
      try {
        const response = await seriesControllerUpdateProposal({ id: seriesId }, body)
        const updated = response.data as SeriesResDtoOutput
        toast.success(t('seriesDetail.editProposal.success'))
        return updated
      } catch (err) {
        if (isFetchError(err)) {
          if (err.status === 409) {
            toast.error(t('seriesDetail.editProposal.errorConflict'))
            return null
          }
          if (err.status === 403) {
            toast.error(t('seriesDetail.editProposal.errorPermission'))
            return null
          }
        }
        toast.error(extractApiErrorMessage(err, t('seriesDetail.editProposal.errorGeneric')))
        return null
      } finally {
        setIsUpdating(false)
      }
    },
    [t]
  )

  return { update, isUpdating }
}
