import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { ChapterListResDtoOutputItemsItem, ChapterResDtoOutput } from '~/api/model/chapters'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import type {
  DeadlineRequestListResDtoOutputItemsItem,
  DeadlineRequestResDtoOutput
} from '~/api/model/deadline-requests'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { chapterControllerGetOne, chapterControllerListBySeries } from '~/api/operations/chapters/chapters'
import {
  deadlineControllerAgree,
  deadlineControllerCounter,
  deadlineControllerCreate,
  deadlineControllerGetOne,
  deadlineControllerList,
  deadlineControllerReject,
  deadlineControllerWithdraw
} from '~/api/operations/deadline-requests/deadline-requests'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { extractApiErrorCode, extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type DeadlineMutation = 'create' | 'counter' | 'agree' | 'reject' | 'withdraw' | null

export type DeadlineDraft = {
  requestedDeadline: string
  reason: string
}

type UseMangakaDeadlinesOptions = {
  initialSeriesId?: string | null
  initialChapterId?: string | null
  initialRequestId?: string | null
}

type UseMangakaDeadlinesResult = {
  series: SeriesListResDtoOutputItemsItem[]
  chapters: ChapterListResDtoOutputItemsItem[]
  requests: DeadlineRequestListResDtoOutputItemsItem[]
  selectedSeriesId: string
  selectedChapterId: string
  selectedRequestId: string
  selectedChapter: ChapterResDtoOutput | null
  selectedRequest: DeadlineRequestResDtoOutput | null
  isLoading: boolean
  isChapterLoading: boolean
  isRequestLoading: boolean
  error: string | null
  activeMutation: DeadlineMutation
  setSelectedSeriesId: (seriesId: string) => void
  setSelectedChapterId: (chapterId: string) => void
  setSelectedRequestId: (requestId: string) => void
  createRequest: (draft: DeadlineDraft) => Promise<boolean>
  counterRequest: (draft: DeadlineDraft) => Promise<boolean>
  agreeRequest: () => Promise<boolean>
  rejectRequest: (reason: string) => Promise<boolean>
  withdrawRequest: () => Promise<boolean>
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
 * Mangaka deadline negotiation state. The UI is deliberately limited to the
 * party actions: create, counter, agree, reject and withdraw. Finalization
 * and Board resolution remain on their dedicated role surfaces.
 */
export function useMangakaDeadlines({
  initialSeriesId,
  initialChapterId,
  initialRequestId
}: UseMangakaDeadlinesOptions): UseMangakaDeadlinesResult {
  const { t } = useTranslation('mangaka')
  const [series, setSeries] = useState<SeriesListResDtoOutputItemsItem[]>([])
  const [chapters, setChapters] = useState<ChapterListResDtoOutputItemsItem[]>([])
  const [requests, setRequests] = useState<DeadlineRequestListResDtoOutputItemsItem[]>([])
  const [selectedSeriesId, setSelectedSeriesIdState] = useState(initialSeriesId ?? '')
  const [selectedChapterId, setSelectedChapterIdState] = useState(initialChapterId ?? '')
  const [selectedRequestId, setSelectedRequestIdState] = useState(initialRequestId ?? '')
  const [selectedChapter, setSelectedChapter] = useState<ChapterResDtoOutput | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<DeadlineRequestResDtoOutput | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isChapterLoading, setIsChapterLoading] = useState(Boolean(initialChapterId))
  const [isRequestLoading, setIsRequestLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeMutation, setActiveMutation] = useState<DeadlineMutation>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const seededRequestRef = useRef<string | null>(null)
  const mutationRef = useRef(false)

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), [])

  const setSelectedSeriesId = useCallback((seriesId: string) => {
    setSelectedSeriesIdState(seriesId)
    setSelectedChapterIdState('')
    setSelectedRequestIdState('')
    setChapters([])
    setRequests([])
    setSelectedChapter(null)
    setSelectedRequest(null)
    setError(null)
    setIsChapterLoading(false)
  }, [])

  const setSelectedChapterId = useCallback((chapterId: string) => {
    setSelectedChapterIdState(chapterId)
    setSelectedRequestIdState('')
    setRequests([])
    setSelectedChapter(null)
    setSelectedRequest(null)
    setError(null)
    setIsChapterLoading(Boolean(chapterId))
  }, [])

  const setSelectedRequestId = useCallback((requestId: string) => {
    setSelectedRequestIdState(requestId)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)
    void seriesControllerListSeries({ limit: 100, offset: 0 }, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setSeries(response.data.items ?? [])
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted && !isAbort(cause)) {
          setError(safeErrorMessage(cause, t('deadlines.error.loadSeriesFailed')))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [refreshToken, t])

  // A notification has only the request id. Resolve it first, then derive the
  // series/chapter selectors so GET /deadline-requests still receives chapterId.
  useEffect(() => {
    if (!initialRequestId || seededRequestRef.current === initialRequestId) return
    const controller = new AbortController()
    seededRequestRef.current = initialRequestId
    setIsRequestLoading(true)
    void deadlineControllerGetOne({ id: initialRequestId }, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return
        const request = response.data
        setSelectedRequest(request)
        setSelectedRequestIdState(request.id)
        setSelectedSeriesIdState(request.seriesId ?? '')
        setSelectedChapterIdState(request.chapterId ?? '')
        setIsChapterLoading(Boolean(request.chapterId))
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted && !isAbort(cause)) {
          setError(safeErrorMessage(cause, t('deadlines.error.loadRequestFailed')))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsRequestLoading(false)
      })
    return () => controller.abort()
  }, [initialRequestId, t])

  useEffect(() => {
    if (!selectedSeriesId) return
    const controller = new AbortController()
    void chapterControllerListBySeries({ seriesId: selectedSeriesId }, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) {
          setChapters([...response.data.items].sort((a, b) => a.chapterNumber - b.chapterNumber))
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted && !isAbort(cause)) {
          setError(safeErrorMessage(cause, t('deadlines.error.loadChaptersFailed')))
        }
      })
    return () => controller.abort()
  }, [selectedSeriesId, t])

  useEffect(() => {
    if (!selectedChapterId) return
    const controller = new AbortController()
    void Promise.all([
      chapterControllerGetOne({ id: selectedChapterId }, { signal: controller.signal }),
      deadlineControllerList({ chapterId: selectedChapterId }, { signal: controller.signal })
    ])
      .then(([chapterResponse, deadlineResponse]) => {
        if (controller.signal.aborted) return
        setSelectedChapter(chapterResponse.data)
        setRequests(deadlineResponse.data.items ?? [])
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted && !isAbort(cause)) {
          setError(safeErrorMessage(cause, t('deadlines.error.loadFailed')))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsChapterLoading(false)
      })
    return () => controller.abort()
  }, [refreshToken, selectedChapterId, t])

  useEffect(() => {
    if (!selectedRequestId) return
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsRequestLoading(true)
    void deadlineControllerGetOne({ id: selectedRequestId }, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setSelectedRequest(response.data)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted && !isAbort(cause)) {
          setError(safeErrorMessage(cause, t('deadlines.error.loadRequestFailed')))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsRequestLoading(false)
      })
    return () => controller.abort()
  }, [refreshToken, selectedRequestId, t])

  const runMutation = useCallback(
    async (mutation: Exclude<DeadlineMutation, null>, action: () => Promise<unknown>): Promise<boolean> => {
      if (mutationRef.current) return false
      mutationRef.current = true
      setActiveMutation(mutation)
      try {
        await action()
        toast.success(t(`deadlines.success.${mutation}`))
        refresh()
        return true
      } catch (cause: unknown) {
        const code = extractApiErrorCode(cause)
        if (isFetchError(cause) && cause.status === 403) {
          toast.error(t('deadlines.error.notParticipant'))
        } else if (isFetchError(cause) && cause.status === 404) {
          toast.error(t('deadlines.error.notFound'))
        } else if (code === 'Error.DeadlineNotOpen' || (isFetchError(cause) && cause.status === 409)) {
          toast.error(t('deadlines.error.notOpen'))
        } else {
          toast.error(safeErrorMessage(cause, t(`deadlines.error.${mutation}Failed`)))
        }
        return false
      } finally {
        mutationRef.current = false
        setActiveMutation(null)
      }
    },
    [refresh, t]
  )

  const createRequest = useCallback(
    async (draft: DeadlineDraft) => {
      if (!selectedChapterId) return false
      return runMutation('create', () => deadlineControllerCreate({ chapterId: selectedChapterId, ...draft }))
    },
    [runMutation, selectedChapterId]
  )

  const counterRequest = useCallback(
    async (draft: DeadlineDraft) => {
      if (!selectedRequestId) return false
      return runMutation('counter', () => deadlineControllerCounter({ id: selectedRequestId }, draft))
    },
    [runMutation, selectedRequestId]
  )

  const agreeRequest = useCallback(async () => {
    if (!selectedRequestId) return false
    return runMutation('agree', () => deadlineControllerAgree({ id: selectedRequestId }))
  }, [runMutation, selectedRequestId])

  const rejectRequest = useCallback(
    async (reason: string) => {
      if (!selectedRequestId) return false
      return runMutation('reject', () => deadlineControllerReject({ id: selectedRequestId }, { reason }))
    },
    [runMutation, selectedRequestId]
  )

  const withdrawRequest = useCallback(async () => {
    if (!selectedRequestId) return false
    return runMutation('withdraw', () => deadlineControllerWithdraw({ id: selectedRequestId }))
  }, [runMutation, selectedRequestId])

  return {
    series,
    chapters,
    requests,
    selectedSeriesId,
    selectedChapterId,
    selectedRequestId,
    selectedChapter,
    selectedRequest,
    isLoading,
    isChapterLoading,
    isRequestLoading,
    error,
    activeMutation,
    setSelectedSeriesId,
    setSelectedChapterId,
    setSelectedRequestId,
    createRequest,
    counterRequest,
    agreeRequest,
    rejectRequest,
    withdrawRequest,
    refresh
  }
}
