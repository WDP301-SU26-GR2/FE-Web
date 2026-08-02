import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { seriesControllerGetSeries } from '~/api/operations/series/series'
import type {
  SeriesResDtoOutput,
  SeriesResDtoOutputProposalStoryboardPagesItem,
  SeriesResDtoOutputProposalStatus
} from '~/api/model/series'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export type ProposalStoryboardView = {
  id: string
  chapterNumber: number | null
  kind: 'PROPOSAL'
  status: SeriesResDtoOutputProposalStatus
  version: number
  pages: SeriesResDtoOutputProposalStoryboardPagesItem[]
  submittedAt: string | null
}

type UseSeriesDetailResult = {
  series: SeriesResDtoOutput | null
  names: ProposalStoryboardView[]
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
  const [names, setNames] = useState<ProposalStoryboardView[]>([])
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
        const seriesRes = await seriesControllerGetSeries({ id: targetId }, { signal })

        if (signal.aborted) return
        // customFetch never resolves a non-2xx (it throws `FetchError` instead),
        // so the success branch is guaranteed here. Narrow via cast for TS.
        const detail = seriesRes.data as SeriesResDtoOutput
        setSeries(detail)
        setNames(
          detail.proposal
            ? [
                {
                  id: detail.id,
                  chapterNumber: null,
                  kind: 'PROPOSAL',
                  status: detail.proposal.status,
                  version: 1,
                  pages: detail.proposal.storyboardPages,
                  submittedAt: detail.proposal.createdAt
                }
              ]
            : []
        )
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
