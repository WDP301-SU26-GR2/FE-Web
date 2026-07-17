import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  taskControllerCreateRegion,
  taskControllerListRegions,
  taskControllerRemoveRegion,
  taskControllerUpdateRegion
} from '~/api/operations/task/task'
import type {
  CreateRegionBodyDto,
  RegionListResDtoOutput,
  RegionResDtoOutput,
  UpdateRegionBodyDto
} from '~/api/model/task'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export type RegionType = 'PANEL' | 'BACKGROUND' | 'SPEECH_BUBBLE' | 'SFX' | 'CHARACTER'

type UsePageRegionsResult = {
  regions: RegionResDtoOutput[]
  isLoading: boolean
  error: string | null
  refresh: () => void
  /** Create a region (manual drag-create). Returns the new region or `null`. */
  createRegion: (input: {
    regionType?: RegionType
    coordinates: { x: number; y: number; width: number; height: number }
  }) => Promise<RegionResDtoOutput | null>
  /** Edit a region's bounding box or regionType. */
  updateRegion: (
    regionId: string,
    patch: {
      coordinates?: { x: number; y: number; width: number; height: number }
      regionType?: RegionType
      confirmedByMangaka?: boolean
    }
  ) => Promise<RegionResDtoOutput | null>
  /** Mark an AI-proposed region as confirmed. Convenient alias of `updateRegion`. */
  confirmRegion: (regionId: string) => Promise<RegionResDtoOutput | null>
  deleteRegion: (regionId: string) => Promise<boolean>
  isMutating: boolean
}

/**
 * List + CRUD hook for Region[] anchored to a Page (`GET /pages/:id/regions`).
 *
 * Per FE-API-Guide §6 (Flow 3 — Region / Task / AI segmentation), Regions
 * either:
 *   - `createdBy='MANUAL'` — drawn by Mangaka;
 *   - `createdBy='AI'` — proposed by an `aiControllerApplyJob` job.
 *
 * AI-proposed regions keep `confirmedByMangaka=false` until the Mangaka
 * reviews and confirms them. Confirming flips the bit via
 * `PATCH /regions/:id { confirmedByMangaka: true }`. Unconfirmed regions
 * should be visually distinguished in the UI (dashed border).
 *
 * Coordinates are stored as a top-left pixel-rectangle `{x, y, width, height}`
 * relative to the page's original image. The canvas layer is responsible for
 * converting pointer events to these pixel coordinates before calling
 * `createRegion`.
 */
export function usePageRegions(pageId: string | null | undefined): UsePageRegionsResult {
  const { t } = useTranslation('mangaka')
  const [regions, setRegions] = useState<RegionResDtoOutput[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [isMutating, setIsMutating] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fetchList = useCallback(
    async (pid: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const signal = controller.signal

      setIsLoading(true)
      setError(null)
      try {
        const res = await taskControllerListRegions({ id: pid }, { signal })
        if (signal.aborted) return
        const items = (res.data as RegionListResDtoOutput).items ?? []
        setRegions(items)
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        if (isFetchError(err) && (err.status === 403 || err.status === 404)) {
          setRegions([])
          return
        }
        setError(err instanceof Error ? err.message : t('studio.popup.errors.loadFailed'))
      } finally {
        if (!signal.aborted) setIsLoading(false)
      }
    },
    [t]
  )

  useEffect(() => {
    if (!pageId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRegions([])
      return
    }
    void fetchList(pageId)
    return () => abortRef.current?.abort()
  }, [pageId, reloadToken, fetchList])

  const refresh = useCallback(() => setReloadToken((n) => n + 1), [])

  const createRegion: UsePageRegionsResult['createRegion'] = useCallback(
    async ({ regionType, coordinates }) => {
      if (!pageId) return null
      setIsMutating(true)
      try {
        const body: CreateRegionBodyDto = { coordinates, regionType }
        const res = await taskControllerCreateRegion({ id: pageId }, body)
        const created = res.data as RegionResDtoOutput
        refresh()
        return created
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('studio.popup.errors.createFailed')))
        return null
      } finally {
        setIsMutating(false)
      }
    },
    [pageId, refresh, t]
  )

  const updateRegion: UsePageRegionsResult['updateRegion'] = useCallback(
    async (regionId, patch) => {
      setIsMutating(true)
      try {
        const body: UpdateRegionBodyDto = {
          ...(patch.coordinates ? { coordinates: patch.coordinates } : {}),
          ...(patch.regionType ? { regionType: patch.regionType } : {}),
          ...(patch.confirmedByMangaka !== undefined
            ? { confirmedByMangaka: patch.confirmedByMangaka }
            : {})
        }
        const res = await taskControllerUpdateRegion({ id: regionId }, body)
        const updated = res.data as RegionResDtoOutput
        setRegions((prev) => prev.map((r) => (r.id === regionId ? updated : r)))
        return updated
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('studio.popup.errors.updateFailed')))
        return null
      } finally {
        setIsMutating(false)
      }
    },
    [t]
  )

  const confirmRegion: UsePageRegionsResult['confirmRegion'] = useCallback(
    async (regionId) => updateRegion(regionId, { confirmedByMangaka: true }),
    [updateRegion]
  )

  const deleteRegion: UsePageRegionsResult['deleteRegion'] = useCallback(
    async (regionId) => {
      setIsMutating(true)
      try {
        await taskControllerRemoveRegion({ id: regionId })
        setRegions((prev) => prev.filter((r) => r.id !== regionId))
        return true
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('studio.popup.errors.deleteFailed')))
        return false
      } finally {
        setIsMutating(false)
      }
    },
    [t]
  )

  return {
    regions,
    isLoading,
    error,
    refresh,
    createRegion,
    updateRegion,
    confirmRegion,
    deleteRegion,
    isMutating
  }
}
