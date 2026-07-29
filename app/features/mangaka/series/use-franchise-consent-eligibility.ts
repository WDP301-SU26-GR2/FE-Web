import { useEffect, useState } from 'react'

import { seriesControllerGetSeries } from '~/api/operations/series/series'
import type { SeriesResDtoOutput } from '~/api/model/series'

type UseFranchiseConsentEligibilityResult = {
  isOriginalMangaka: boolean
  isLoading: boolean
}

/**
 * The consent endpoint is authorized by the original (parent) series owner,
 * not by the derivative series owner. `SeriesResDtoOutput` exposes only the
 * parent id, so load that record and compare its documented `mangakaId`.
 */
export function useFranchiseConsentEligibility(
  parentSeriesId: string | null | undefined,
  currentUserId: string | undefined
): UseFranchiseConsentEligibilityResult {
  const [parentMangakaId, setParentMangakaId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!parentSeriesId || !currentUserId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setParentMangakaId(null)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    void seriesControllerGetSeries({ id: parentSeriesId }, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setParentMangakaId((response.data as SeriesResDtoOutput).mangakaId)
      })
      .catch(() => {
        if (!controller.signal.aborted) setParentMangakaId(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [currentUserId, parentSeriesId])

  return { isOriginalMangaka: parentMangakaId === currentUserId, isLoading }
}
