import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { studioControllerListAssignments } from '~/api/operations/studio/studio'
import type { AssignmentListResDtoOutputItemsItem } from '~/api/model/studio'
import type { StudioControllerListAssignmentsStatus } from '~/api/model/studio/studioControllerListAssignmentsStatus'
import { StudioControllerListAssignmentsActiveNow } from '~/api/model/studio/studioControllerListAssignmentsActiveNow'
import { isFetchError } from '~/api/mutator/custom-fetch'

export const STUDIO_PAGE_SIZE = 8

export type StudioFilterStatus = StudioControllerListAssignmentsStatus | undefined

export type EnrichedAssignment = {
  assignment: AssignmentListResDtoOutputItemsItem
}

/**
 * Fetches the current Mangaka's studio assignments (`GET /studio-assignments`).
 *
 * BE contract (FE-API-Guide-v3.md §7, Spec 20):
 *  - Each item carries an embedded `assistant?: UserMini` and `mangaka?: UserMini`
 *    so the FE can render displayName/avatar without an extra round-trip.
 *  - We no longer fire a parallel `GET /assistants?limit=100` pool — that was
 *    an n+1 antipattern and capped at 100, causing silent placeholders for
 *    assistants beyond that. The embedded field is the source of truth.
 */
type UseMyStudioAssignmentsResult = {
  items: EnrichedAssignment[]
  total: number
  page: number
  perPage: number
  isLoading: boolean
  error: string | null
  status: StudioFilterStatus
  setStatus: (status: StudioFilterStatus) => void
  setPage: (page: number) => void
  refresh: () => void
}

/**
 * Hook behaviour:
 *  - `status` filter maps to BE query param (omitted = "all"). When the user
 *    picks ACTIVE we additionally send `activeNow=true` so the BE narrows the
 *    list to assignments actually in their hire window (lazy check).
 *  - Pagination is 1-based; offset is `(page - 1) * STUDIO_PAGE_SIZE`.
 *  - 403/404 is treated as "no data" — fresh Mangakas still get a usable
 *    empty state.
 */
export function useMyStudioAssignments(): UseMyStudioAssignmentsResult {
  const { t } = useTranslation('common')
  const [items, setItems] = useState<EnrichedAssignment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPageState] = useState(1)
  const [status, setStatus] = useState<StudioFilterStatus>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const abortRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(
    async (signal: AbortSignal, targetPage: number, currentStatus: StudioFilterStatus): Promise<void> => {
      const offset = (targetPage - 1) * STUDIO_PAGE_SIZE
      const params: {
        limit: number
        offset: number
        status?: StudioControllerListAssignmentsStatus
        activeNow?: typeof StudioControllerListAssignmentsActiveNow.true
      } = {
        limit: STUDIO_PAGE_SIZE,
        offset
      }
      if (currentStatus) params.status = currentStatus
      // When the Mangaka is on the "ACTIVE" tab we also want to filter out
      // assignments whose hire window has elapsed — `activeNow=true` enforces
      // that lazy check on the BE.
      if (currentStatus === 'ACTIVE') params.activeNow = StudioControllerListAssignmentsActiveNow.true

      const res = await studioControllerListAssignments(params, { signal })
      if (signal.aborted) return

      const assignments = res.data.items ?? []
      setItems(assignments.map((assignment) => ({ assignment })))
      setTotal(res.data.total)
    },
    []
  )

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
        await fetchPage(signal, page, status)
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        if (isFetchError(err) && (err.status === 403 || err.status === 404)) {
          setItems([])
          setTotal(0)
        } else {
          setError(err instanceof Error ? err.message : t('errors.unknown'))
        }
      }
      if (!signal.aborted) {
        setIsLoading(false)
      }
    })()

    return () => abortRef.current?.abort()
  }, [page, status, reloadToken, fetchPage, t])

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
    perPage: STUDIO_PAGE_SIZE,
    isLoading,
    error,
    status,
    setStatus,
    setPage,
    refresh
  }
}
