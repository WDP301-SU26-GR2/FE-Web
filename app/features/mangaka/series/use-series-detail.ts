import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { seriesControllerGetSeries } from '~/api/operations/series/series'
import { nameControllerGetOne, nameControllerList } from '~/api/operations/names/names'
import type { SeriesResDtoOutput } from '~/api/model/series'
import type { NameListResDtoOutput, NameListResDtoOutputItemsItem } from '~/api/model/names'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type UseSeriesDetailResult = {
  series: SeriesResDtoOutput | null
  names: NameListResDtoOutputItemsItem[]
  isLoading: boolean
  error: string | null
  notFound: boolean
  refresh: () => void
}

/**
 * Fetch `/series/:id` (proposal-inclusive detail) and `/series/:id/names`
 * (proposal-scoped sample Name only) in parallel. Chapter Names use the
 * `/chapters/:id/names` clients in the publication slice.
 *
 * - Stale requests are cancelled via AbortController when the `id` changes
 *   or the component unmounts.
 * - 404 maps to `notFound: true` so the page can render its not-found UI
 *   distinctly from generic API errors.
 */
export function useSeriesDetail(id: string): UseSeriesDetailResult {
  const { t } = useTranslation('common')
  const [series, setSeries] = useState<SeriesResDtoOutput | null>(null)
  const [names, setNames] = useState<NameListResDtoOutputItemsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const abortRef = useRef<AbortController | null>(null)

  const fetchDetail = useCallback(
    async (targetId: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const signal = controller.signal

      setIsLoading(true)
      setError(null)
      setNotFound(false)

      try {
        const [seriesRes, namesRes] = await Promise.all([
          seriesControllerGetSeries({ id: targetId }, { signal }),
          nameControllerList({ id: targetId }, undefined, { signal })
        ])

        if (signal.aborted) return
        // customFetch never resolves a non-2xx (it throws `FetchError` instead),
        // so the success branch is guaranteed here. Narrow via cast for TS.
        setSeries(seriesRes.data as SeriesResDtoOutput)
        const listedNames = (namesRes.data as NameListResDtoOutput).items
        const detailedNames = await Promise.all(
          listedNames.map(async (listedName) => {
            const detail = await nameControllerGetOne({ id: targetId, nameId: listedName.id }, { signal })
            return detail.data as unknown as NameListResDtoOutputItemsItem
          })
        )
        if (signal.aborted) return
        setNames(detailedNames)
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        if (isFetchError(err) && err.status === 404) {
          setNotFound(true)
        } else {
          setError(extractApiErrorMessage(err, t('errors.unknown')))
        }
      }
      if (!signal.aborted) {
        setIsLoading(false)
      }
    },
    [t]
  )

  useEffect(() => {
    if (!id) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDetail(id)
    return () => abortRef.current?.abort()
  }, [id, reloadToken, fetchDetail])

  const refresh = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  return { series, names, isLoading, error, notFound, refresh }
}
