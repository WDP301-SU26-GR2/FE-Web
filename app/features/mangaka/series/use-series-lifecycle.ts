import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { seriesControllerFranchiseConsent, seriesControllerUpdateSeriesMetadata } from '~/api/operations/series/series'
import type { SeriesResDtoOutput, UpdateSeriesMetadataBodyDto } from '~/api/model/series'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { extractApiErrorCode, extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { uploadToR2 } from '~/shared/lib/upload/upload-to-r2'

export type SeriesLifecycleAction = 'metadata' | 'franchiseConsent' | null

export type SeriesMetadataInput = {
  title?: string
  synopsis?: string
  coverImage: { intent: 'keep' } | { intent: 'remove' } | { intent: 'replace'; file: File }
  characterDesigns?: { existingKeys: string[]; newFiles: File[] }
}

function extractSafeApiMessage(error: unknown, fallback: string): string {
  const message = extractApiErrorMessage(error, fallback).trim()
  return message.startsWith('Error.') ? fallback : message
}

type UseSeriesLifecycleResult = {
  activeAction: SeriesLifecycleAction
  updateMetadata: (seriesId: string, input: SeriesMetadataInput) => Promise<SeriesResDtoOutput | null>
  giveFranchiseConsent: (seriesId: string, approve: boolean) => Promise<SeriesResDtoOutput | null>
}

/**
 * Mangaka-only lifecycle mutations that belong to a serialized series.
 * Each action is guarded locally against duplicate submission; the backend
 * remains the authority for ownership and state-machine rules.
 */
export function useSeriesLifecycle(): UseSeriesLifecycleResult {
  const { t } = useTranslation('mangaka')
  const [activeAction, setActiveAction] = useState<SeriesLifecycleAction>(null)

  const updateMetadata = useCallback(
    async (seriesId: string, input: SeriesMetadataInput) => {
      if (!seriesId || activeAction) return null

      setActiveAction('metadata')
      try {
        const body: UpdateSeriesMetadataBodyDto = {}
        if (input.title !== undefined) body.title = input.title
        if (input.synopsis !== undefined) body.synopsis = input.synopsis

        if (input.coverImage.intent === 'remove') {
          body.coverImage = ''
        } else if (input.coverImage.intent === 'replace') {
          body.coverImage = await uploadToR2(input.coverImage.file)
        }

        if (input.characterDesigns) {
          const uploadedKeys = await Promise.all(input.characterDesigns.newFiles.map((file) => uploadToR2(file)))
          body.characterDesigns = [...input.characterDesigns.existingKeys, ...uploadedKeys]
        }

        const response = await seriesControllerUpdateSeriesMetadata({ id: seriesId }, body)
        toast.success(t('seriesDetail.lifecycle.metadata.success'))
        return response.data as SeriesResDtoOutput
      } catch (error: unknown) {
        if (isFetchError(error)) {
          if (error.status === 403) {
            toast.error(t('seriesDetail.lifecycle.metadata.errorPermission'))
            return null
          }
          if (error.status === 404) {
            toast.error(t('seriesDetail.lifecycle.metadata.errorNotFound'))
            return null
          }
          if (error.status === 409) {
            toast.error(
              extractApiErrorCode(error) === 'Error.SeriesMetadataConflict'
                ? t('seriesDetail.lifecycle.metadata.errorConflict')
                : t('seriesDetail.lifecycle.metadata.errorNotEditable')
            )
            return null
          }
        }
        toast.error(extractSafeApiMessage(error, t('seriesDetail.lifecycle.metadata.errorGeneric')))
        return null
      } finally {
        setActiveAction(null)
      }
    },
    [activeAction, t]
  )

  const giveFranchiseConsent = useCallback(
    async (seriesId: string, approve: boolean) => {
      if (!seriesId || activeAction) return null

      setActiveAction('franchiseConsent')
      try {
        const response = await seriesControllerFranchiseConsent({ id: seriesId }, { approve })
        toast.success(
          t(
            approve
              ? 'seriesDetail.lifecycle.franchise.approveSuccess'
              : 'seriesDetail.lifecycle.franchise.rejectSuccess'
          )
        )
        return response.data as SeriesResDtoOutput
      } catch (error: unknown) {
        if (isFetchError(error)) {
          if (error.status === 403) {
            toast.error(t('seriesDetail.lifecycle.franchise.errorPermission'))
            return null
          }
          if (error.status === 404) {
            toast.error(t('seriesDetail.lifecycle.franchise.errorNotFound'))
            return null
          }
          if (error.status === 409) {
            toast.error(t('seriesDetail.lifecycle.franchise.errorNoLongerPending'))
            return null
          }
        }
        toast.error(extractSafeApiMessage(error, t('seriesDetail.lifecycle.franchise.errorGeneric')))
        return null
      } finally {
        setActiveAction(null)
      }
    },
    [activeAction, t]
  )

  return { activeAction, updateMetadata, giveFranchiseConsent }
}
