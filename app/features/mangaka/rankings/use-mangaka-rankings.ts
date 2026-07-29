import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  publicRankingControllerGetLatestVoteResults,
  surveyControllerGetBoardRanking,
  surveyControllerGetSeriesTrend,
  publicRankingControllerGetVotePeriods,
  publicRankingControllerGetVoteResults
} from '~/api/operations/survey/survey'
import type {
  LatestVoteResultsResDtoOutput,
  VotePeriodsResDtoOutput,
  VoteResultsResDtoOutput
} from '~/api/model/survey'
import type { BoardRankingListResDtoOutput } from '~/api/model/survey/boardRankingListResDtoOutput'
import type { PublicRankingControllerGetLatestVoteResultsPublicationType } from '~/api/model/survey/publicRankingControllerGetLatestVoteResultsPublicationType'
import { extractApiErrorCode, extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

/**
 * The public ranking endpoints are scoped by both magazine and publication
 * type in the current OpenAPI contract.
 */
export type RankingPublicationType = PublicRankingControllerGetLatestVoteResultsPublicationType

export const PUBLICATION_TYPE_OPTIONS: ReadonlyArray<RankingPublicationType> = ['WEEKLY', 'MONTHLY', 'IRREGULAR']

type UseMangakaRankingsResult = {
  latest: LatestVoteResultsResDtoOutput | null
  periods: VotePeriodsResDtoOutput['items']
  trend: BoardRankingListResDtoOutput['items']
  isLoading: boolean
  error: string | null
  publicationType: RankingPublicationType
  setPublicationType: (value: RankingPublicationType) => void
  magazine: string
  setMagazine: (value: string) => void
  selectedPeriodId: string | null
  setSelectedPeriodId: (id: string | null) => void
  periodResults: VoteResultsResDtoOutput | null
  isLoadingPeriod: boolean
  selectedSeriesId: string | null
  setSelectedSeriesId: (id: string | null) => void
  boardPeriods: VotePeriodsResDtoOutput['items']
  selectedBoardPeriodId: string | null
  setSelectedBoardPeriodId: (id: string | null) => void
  boardRankings: BoardRankingListResDtoOutput['items']
  isLoadingBoardPeriods: boolean
  isLoadingBoardRankings: boolean
  boardError: string | null
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
  const [publicationType, setPublicationType] = useState<RankingPublicationType>('WEEKLY')
  const [magazine, setMagazine] = useState('')

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [periodResults, setPeriodResults] = useState<VoteResultsResDtoOutput | null>(null)
  const [isLoadingPeriod, setIsLoadingPeriod] = useState(false)

  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [trend, setTrend] = useState<BoardRankingListResDtoOutput['items']>([])

  const [boardPeriods, setBoardPeriods] = useState<VotePeriodsResDtoOutput['items']>([])
  const [selectedBoardPeriodId, setSelectedBoardPeriodId] = useState<string | null>(null)
  const [boardRankings, setBoardRankings] = useState<BoardRankingListResDtoOutput['items']>([])
  const [isLoadingBoardPeriods, setIsLoadingBoardPeriods] = useState(true)
  const [isLoadingBoardRankings, setIsLoadingBoardRankings] = useState(false)
  const [boardError, setBoardError] = useState<string | null>(null)

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

    if (!magazine.trim()) {
      void Promise.resolve().then(() => {
        if (signal.aborted) return
        setLatest(null)
        setPeriods([])
        setBoardPeriods([])
        setSelectedBoardPeriodId(null)
        setIsLoading(false)
        setIsLoadingBoardPeriods(false)
      })
      return () => controller.abort()
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setIsLoadingBoardPeriods(true)
    setError(null)
    ;(async () => {
      try {
        const [latestRes, periodsRes] = await Promise.all([
          publicRankingControllerGetLatestVoteResults({ magazine: magazine.trim(), publicationType }, { signal }),
          publicRankingControllerGetVotePeriods({ magazine: magazine.trim(), publicationType, limit: 24 }, { signal })
        ])
        if (signal.aborted) return
        setLatest(latestRes.data)
        setPeriods(periodsRes.data.items)
        setBoardPeriods(periodsRes.data.items)
        setSelectedBoardPeriodId((current) =>
          current && periodsRes.data.items.some((period) => period.id === current)
            ? current
            : (periodsRes.data.items[0]?.id ?? null)
        )
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        setError(extractApiErrorMessage(err, t('rankings.error.loadFailed')))
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
          setIsLoadingBoardPeriods(false)
        }
      }
    })()

    return () => abortRef.current?.abort()
  }, [magazine, publicationType, reloadToken, t])

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
        const res = await publicRankingControllerGetVoteResults({ surveyPeriodId: selectedPeriodId }, { signal })
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
        const res = await surveyControllerGetSeriesTrend({ seriesId: selectedSeriesId, periods: 12 }, { signal })
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

  // Exact `GET /rankings/board` coverage. It remains read-only and is called
  // only after the user has a reflected survey period to inspect.
  useEffect(() => {
    if (!selectedBoardPeriodId) {
      return
    }

    const controller = new AbortController()
    const signal = controller.signal
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingBoardRankings(true)
    setBoardError(null)
    ;(async () => {
      try {
        const response = await surveyControllerGetBoardRanking({ surveyPeriodId: selectedBoardPeriodId }, { signal })
        if (signal.aborted) return
        setBoardRankings(response.data.items)
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        setBoardRankings([])
        setBoardError(getBoardRankingErrorMessage(err, t))
      } finally {
        if (!signal.aborted) setIsLoadingBoardRankings(false)
      }
    })()

    return () => controller.abort()
  }, [selectedBoardPeriodId, reloadToken, t])

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
    magazine,
    setMagazine,
    selectedPeriodId,
    setSelectedPeriodId,
    periodResults,
    isLoadingPeriod,
    selectedSeriesId,
    setSelectedSeriesId,
    boardPeriods,
    selectedBoardPeriodId,
    setSelectedBoardPeriodId,
    boardRankings,
    isLoadingBoardPeriods,
    isLoadingBoardRankings,
    boardError,
    refresh
  }
}

function getBoardRankingErrorMessage(error: unknown, t: ReturnType<typeof useTranslation>['t']): string {
  switch (extractApiErrorCode(error)) {
    case 'Error.SurveyPeriodNotFound':
      return t('rankings.board.error.periodNotFound')
    case 'Error.RankingAccessDenied':
      return t('rankings.board.error.accessDenied')
    default:
      return t('rankings.board.error.loadFailed')
  }
}
