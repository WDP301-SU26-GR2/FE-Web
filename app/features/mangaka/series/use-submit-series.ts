import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { seriesControllerSubmit } from '~/api/operations/series/series'
import type { SeriesResDtoOutput } from '~/api/model/series'
import { extractApiErrorCode, extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

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
 * SUBMITTED. On failure surfaces a translated error toast by mapping the BE
 * error code to `seriesDetail.actions.errors.<Code>` (same pattern as
 * `useProposalActions`). Falls back to `extractApiErrorMessage` → generic i18n.
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
        const payload = response.data as SeriesResDtoOutput
        toast.success(t('seriesDetail.submit.success'))
        return payload
      } catch (err) {
        const code = extractApiErrorCode(err)
        if (code) {
          // Strip "Error." prefix and look up the shared error-code i18n map
          const shortCode = code.startsWith('Error.') ? code.slice('Error.'.length) : code
          const mapped = t(`seriesDetail.actions.errors.${shortCode}`, {
            defaultValue: ''
          })
          toast.error(mapped || extractApiErrorMessage(err, t('seriesDetail.submit.errorGeneric')))
        } else {
          toast.error(extractApiErrorMessage(err, t('seriesDetail.submit.errorGeneric')))
        }
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [t]
  )

  return { submit, isSubmitting }
}
