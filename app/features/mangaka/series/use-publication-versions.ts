import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  PublicationVersionListResDtoOutputItemsItem,
  PublicationVersionResDtoOutput
} from '~/api/model/publication-versions'
import {
  publicationControllerGetOne,
  publicationControllerList
} from '~/api/operations/publication-versions/publication-versions'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type UsePublicationVersionsResult = {
  versions: PublicationVersionListResDtoOutputItemsItem[]
  selectedVersionId: string | null
  selectedVersion: PublicationVersionResDtoOutput | null
  isLoading: boolean
  isDetailLoading: boolean
  listError: string | null
  detailError: string | null
  selectVersion: (id: string) => void
  clearSelection: () => void
  refresh: () => void
}

function safeErrorMessage(error: unknown, fallback: string): string {
  const message = extractApiErrorMessage(error, fallback).trim()
  return message.startsWith('Error.') ? fallback : message
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

/**
 * Read-only publication-version history for one series. The detail endpoint
 * is intentionally loaded only after a user opens an item, keeping the series
 * detail route lightweight while still exercising the scoped GET endpoint.
 */
export function usePublicationVersions(seriesId: string | null | undefined): UsePublicationVersionsResult {
  const { t } = useTranslation('mangaka')
  const [versions, setVersions] = useState<PublicationVersionListResDtoOutputItemsItem[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<PublicationVersionResDtoOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const listAbortRef = useRef<AbortController | null>(null)
  const detailAbortRef = useRef<AbortController | null>(null)
  const [versionsSeriesId, setVersionsSeriesId] = useState<string | null>(null)
  const [selectionSeriesId, setSelectionSeriesId] = useState<string | null>(null)

  useEffect(() => {
    listAbortRef.current?.abort()
    if (!seriesId) {
      return
    }

    const controller = new AbortController()
    listAbortRef.current = controller
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setListError(null)
    void publicationControllerList({ seriesId }, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) {
          setVersionsSeriesId(seriesId)
          setVersions(response.data.items ?? [])
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isAbort(error)) {
          setVersionsSeriesId(seriesId)
          setVersions([])
          setListError(safeErrorMessage(error, t('seriesDetail.publicationVersions.error.loadFailed')))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [refreshToken, seriesId, t])

  useEffect(() => {
    detailAbortRef.current?.abort()
    if (!selectedVersionId || selectionSeriesId !== seriesId) {
      return
    }

    const controller = new AbortController()
    detailAbortRef.current = controller
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDetailLoading(true)
    setSelectedVersion(null)
    setDetailError(null)
    void publicationControllerGetOne({ id: selectedVersionId }, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setSelectedVersion(response.data)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isAbort(error)) {
          setDetailError(safeErrorMessage(error, t('seriesDetail.publicationVersions.error.detailFailed')))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsDetailLoading(false)
      })

    return () => controller.abort()
  }, [selectedVersionId, selectionSeriesId, seriesId, t])

  const selectVersion = useCallback(
    (id: string) => {
      setSelectionSeriesId(seriesId ?? null)
      setSelectedVersionId(id)
      setSelectedVersion(null)
      setDetailError(null)
    },
    [seriesId]
  )
  const clearSelection = useCallback(() => {
    detailAbortRef.current?.abort()
    setSelectionSeriesId(null)
    setSelectedVersionId(null)
    setSelectedVersion(null)
    setDetailError(null)
    setIsDetailLoading(false)
  }, [])
  const refresh = useCallback(() => setRefreshToken((value) => value + 1), [])

  const listBelongsToSeries = versionsSeriesId === seriesId
  const selectionBelongsToSeries = selectionSeriesId === seriesId

  return {
    versions: listBelongsToSeries ? versions : [],
    selectedVersionId: selectionBelongsToSeries ? selectedVersionId : null,
    selectedVersion: selectionBelongsToSeries ? selectedVersion : null,
    isLoading,
    isDetailLoading: selectionBelongsToSeries && isDetailLoading,
    listError: listBelongsToSeries ? listError : null,
    detailError: selectionBelongsToSeries ? detailError : null,
    selectVersion,
    clearSelection,
    refresh
  }
}
