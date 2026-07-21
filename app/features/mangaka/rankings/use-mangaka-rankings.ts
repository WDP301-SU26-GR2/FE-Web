import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  surveyControllerGetLatestVoteResults,
  surveyControllerGetSeriesTrend,
  surveyControllerGetVotePeriods,
  surveyControllerGetVoteResults
} from '~/api/operations/survey/survey'
import type {
  LatestVoteResultsResDtoOutput,
  VotePeriodsResDtoOutput,
  VoteResultsResDtoOutput
} from '~/api/model/survey'
import type { BoardRankingListResDtoOutput } from '~/api/model/survey/boardRankingListResDtoOutput'
import type { SurveyControllerGetLatestVoteResultsPublicationType } from '~/api/model/survey/surveyControllerGetLatestVoteResultsPublicationType'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

/**
 * Filter for the latest-results board. Mirrors §9 of FE-API-Guide-v3:
 *  - omit       → overall (no publication-type filter)
 *  - WEEKLY     → only series with that publication type
 *  - MONTHLY    → same
 *  - IRREGULAR  → same
 */
export type RankingPublicationType = SurveyControllerGetLatestVoteResultsPublicationType | 'ALL'

export const PUBLICATION_TYPE_OPTIONS: ReadonlyArray<RankingPublicationType> = [
  'ALL',
  'WEEKLY',
  'MONTHLY',
  'IRREGULAR'
]

type UseMangakaRankingsResult = {
  latest: LatestVoteResultsResDtoOutput | null
  periods: VotePeriodsResDtoOutput['items']
  trend: BoardRankingListResDtoOutput['items']
  isLoading: boolean
  error: string | null
  publicationType: RankingPublicationType
  setPublicationType: (value: RankingPublicationType) => void
  selectedPeriodId: string | null
  setSelectedPeriodId: (id: string | null) => void
  periodResults: VoteResultsResDtoOutput | null
  isLoadingPeriod: boolean
  selectedSeriesId: string | null
  setSelectedSeriesId: (id: string | null) => void
  refresh: () => void
}

/**
 * Aggregates the data the Mangaka `/dashboard/mangaka/rankings` page needs:
 *
 *   1. `latest`            — `GET /vote/results/latest?publicationType=…` (Public)
 *   2. `periods`           — `GET /vote/periods?limit=…` for the history dropdown
 *   3. `periodResults`     — `GET /vote/results?surveyPeriodId=…` when a period
 *                            is selected from the dropdown
 *   4. `trend`             — `GET /rankings?seriesId=…&periods=…` (PB-04, scoped
 *                            to the current Mangaka's series)
 *
 * Scope of `GET /rankings` is enforced on the BE: a Mangaka can only read
 * series they own. We surface the BE error message verbatim via
 * `extractApiErrorMessage` so the user gets a clear hint (403
 * `Error.RankingAccessDenied` → "you don't own this series") instead of an
 * empty chart.
 */
export function useMangakaRankings(): UseMangakaRankingsResult {
  const { t } = useTranslation('mangaka')

  const [latest, setLatest] = useState<LatestVoteResultsResDtoOutput | null>(null)
  const [periods, setPeriods] = useState<VotePeriodsResDtoOutput['items']>([])
  const [publicationType, setPublicationType] = useState<RankingPublicationType>('ALL')

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [periodResults, setPeriodResults] = useState<VoteResultsResDtoOutput | null>(null)
  const [isLoadingPeriod, setIsLoadingPeriod] = useState(false)

  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [trend, setTrend] = useState<BoardRankingListResDtoOutput['items']>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const abortRef = useRef<AbortController | null>(null)

  // 1 + 2: latest + periods (independent of period selection, so we fetch once
  // and refresh on manual reload).
  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [latestRes, periodsRes] = await Promise.all([
          surveyControllerGetLatestVoteResults(
            publicationType === 'ALL' ? undefined : { publicationType },
            { signal }
          ),
          surveyControllerGetVotePeriods({ limit: 24 }, { signal })
        ])
        if (signal.aborted) return
        setLatest(latestRes.data)
        setPeriods(periodsRes.data.items)
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        setError(extractApiErrorMessage(err, t('rankings.error.loadFailed')))
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
        }
      }
    })()

    return () => abortRef.current?.abort()
  }, [publicationType, reloadToken, t])

  // 3: results for a specific period (independent fetch, fired only when a
  // period is selected).
  useEffect(() => {
    if (!selectedPeriodId) {
      return
    }

    const controller = new AbortController()
    const signal = controller.signal
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingPeriod(true)
    ;(async () => {
      try {
        const res = await surveyControllerGetVoteResults({ surveyPeriodId: selectedPeriodId }, { signal })
        if (signal.aborted) return
        setPeriodResults(res.data)
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        // Soft-fail: just clear the board so we don't strand stale data.
        setPeriodResults(null)
      } finally {
        if (!signal.aborted) {
          setIsLoadingPeriod(false)
        }
      }
    })()

    return () => controller.abort()
  }, [selectedPeriodId])

  // 4: trend for the selected series. Only fetched when the user picks one.
  useEffect(() => {
    if (!selectedSeriesId) {
      return
    }

    const controller = new AbortController()
    const signal = controller.signal
    ;(async () => {
      try {
        const res = await surveyControllerGetSeriesTrend(
          { seriesId: selectedSeriesId, periods: 12 },
          { signal }
        )
        if (signal.aborted) return
        setTrend(res.data.items)
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        setTrend([])
      }
    })()

    return () => controller.abort()
  }, [selectedSeriesId])

  const refresh = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  return {
    latest,
    periods,
    trend,
    isLoading,
    error,
    publicationType,
    setPublicationType,
    selectedPeriodId,
    setSelectedPeriodId,
    periodResults,
    isLoadingPeriod,
    selectedSeriesId,
    setSelectedSeriesId,
    refresh
  }
}
