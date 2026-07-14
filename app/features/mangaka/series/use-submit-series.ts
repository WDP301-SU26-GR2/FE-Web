import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { seriesControllerSubmit } from '~/api/operations/series/series'
import type { CreateProposalResDtoOutput, SeriesResDtoOutput } from '~/api/model/series'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

type UseSubmitSeriesResult = {
  /** Fire POST /series/:id/submit. Returns the new series on success, null on failure. */
  submit: (seriesId: string) => Promise<SeriesResDtoOutput | null>
  isSubmitting: boolean
}

/**
 * Hook for the Mangaka "Submit series for review" action.
 *
 * Calls POST /series/:id/submit (orval-generated `seriesControllerSubmit`).
 * On success the series transitions DRAFT → IN_REVIEW and the Name moves to
 * SUBMITTED. On failure surfaces a translated error toast using the message
 * returned by the BE.
 */
export function useSubmitSeries(): UseSubmitSeriesResult {
  const { t } = useTranslation('mangaka')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = useCallback(
    async (seriesId: string) => {
      if (!seriesId) return null
      setIsSubmitting(true)
      try {
        const response = await seriesControllerSubmit({ id: seriesId })
        // orval returns a status-discriminated union; on success the payload is
        // CreateProposalResDtoOutput which carries { series, proposal, name }.
        const payload = response.data as CreateProposalResDtoOutput
        toast.success(t('seriesDetail.submit.success'))
        return payload.series
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('seriesDetail.submit.errorGeneric')))
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [t]
  )

  return { submit, isSubmitting }
}
