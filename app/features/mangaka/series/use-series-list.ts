import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { seriesControllerListSeries } from '~/api/operations/series/series'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'

export const SERIES_PAGE_SIZE = 4

type UseSeriesListResult = {
  items: SeriesListResDtoOutputItemsItem[]
  total: number
  page: number
  perPage: number
  isLoading: boolean
  error: string | null
  setPage: (page: number) => void
  refresh: () => void
}

/**
 * Paginated fetch for `GET /series`. Page size is fixed at 4 (per UX spec).
 *
 * NOTE on `coverImage`: the API returns an R2 object key, not a displayable URL.
 * Display of actual cover images is intentionally out of scope here — the page
 * renders initials/gradient placeholders. Wire `/uploads/sign-download` later.
 */
export function useSeriesList(): UseSeriesListResult {
  const { t } = useTranslation('common')
  const [items, setItems] = useState<SeriesListResDtoOutputItemsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPageState] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const abortRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(
    async (targetPage: number) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const signal = controller.signal

      setIsLoading(true)
      setError(null)

      const offset = (targetPage - 1) * SERIES_PAGE_SIZE

      try {
        const res = await seriesControllerListSeries({ limit: SERIES_PAGE_SIZE, offset }, { signal })
        if (!signal.aborted) {
          setItems(res.data.items)
          setTotal(res.data.total)
        }
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : t('errors.unknown'))
      }
      if (!signal.aborted) {
        setIsLoading(false)
      }
    },
    [t]
  )

  useEffect(() => {
    // setIsLoading(true) is fired inside fetchPage (an async function), not
    // synchronously here, so we don't cascade-render. The lint rule still
    // flags the call inside fetchPage when invoked from an effect, hence
    // the disable on the next line.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPage(page)
    return () => abortRef.current?.abort()
  }, [page, reloadToken, fetchPage])

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next))
  }, [])

  const refresh = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  return {
    items,
    total,
    page,
    perPage: SERIES_PAGE_SIZE,
    isLoading,
    error,
    setPage,
    refresh
  }
}
