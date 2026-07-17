import { useEffect, useRef, useState } from 'react'

import { seriesControllerListSeries } from '~/api/operations/series/series'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { isFetchError } from '~/api/mutator/custom-fetch'

type UseMangakaSeriesResult = {
  items: SeriesListResDtoOutputItemsItem[]
  isLoading: boolean
  error: string | null
}

/**
 * Lightweight fetcher for the current Mangaka's series.
 *
 * Used by the Studio "Invite assistant" dialog to populate the `seriesId`
 * dropdown. We fetch a single page (max 100 — BE's hard cap). Only series
 * that are still actively being produced or pitched make sense to invite
 * against; downstream filter is the caller's job.
 *
 * 403/404 = Mangaka has no series yet (empty list, not a hard error).
 */
export function useMangakaSeries(): UseMangakaSeriesResult {
  const [items, setItems] = useState<SeriesListResDtoOutputItemsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    ;(async () => {
      await Promise.resolve()
      setIsLoading(true)
      setError(null)
      try {
        const res = await seriesControllerListSeries({ limit: 100, offset: 0 }, { signal })
        if (!signal.aborted) {
          setItems(res.data.items)
        }
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        if (isFetchError(err) && (err.status === 403 || err.status === 404)) {
          setItems([])
        } else {
          setError(err instanceof Error ? err.message : 'errors.unknown')
        }
      }
      if (!signal.aborted) {
        setIsLoading(false)
      }
    })()

    return () => abortRef.current?.abort()
  }, [])

  return { items, isLoading, error }
}
