import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { studioControllerListAssignments } from '~/api/operations/studio/studio'
import { usersControllerListAssistants } from '~/api/operations/users/users'
import type { AssistantDirectoryListResDtoOutputItemsItem } from '~/api/model/users'
import type { AssignmentListResDtoOutputItemsItem } from '~/api/model/studio'
import type { StudioControllerListAssignmentsStatus } from '~/api/model/studio/studioControllerListAssignmentsStatus'
import { isFetchError } from '~/api/mutator/custom-fetch'

export const STUDIO_PAGE_SIZE = 8

export type StudioFilterStatus = StudioControllerListAssignmentsStatus | undefined

export type EnrichedAssignment = {
  assignment: AssignmentListResDtoOutputItemsItem
  /** Profile lookup from the parallel `GET /assistants` fetch. `null` when
   *  the assistant isn't in the pool (profile fetch hit the 100 cap, or the
   *  BE returned a stale assistantId). The card falls back to a derived
   *  placeholder in that case. */
  assistant: AssistantDirectoryListResDtoOutputItemsItem | null
}

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
 * Fetches the current Mangaka's studio assignments (`GET /studio-assignments`)
 * along with a parallel "assistant pool" (`GET /assistants`, capped at 100)
 * so the cards can show the assistant's displayName/avatar/specializations
 * without making an n+1 round trip.
 *
 * UI behaviour:
 * - `status` filter maps to BE query param (omitted = "all").
 * - Pagination is 1-based; offset is `(page - 1) * STUDIO_PAGE_SIZE`.
 * - 403/404 from either call is treated as "no data" — fresh Mangakas still
 *   get a usable empty state.
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

  const fetchAll = useCallback(
    async (
      signal: AbortSignal,
      targetPage: number,
      currentStatus: StudioFilterStatus
    ): Promise<void> => {
      const offset = (targetPage - 1) * STUDIO_PAGE_SIZE
      const params: { limit: number; offset: number; status?: StudioControllerListAssignmentsStatus } = {
        limit: STUDIO_PAGE_SIZE,
        offset
      }
      if (currentStatus) params.status = currentStatus

      // Fire both fetches in parallel — the assistant pool lets us hydrate
      // each card with displayName/avatar/specializations in 1 round trip.
      const [assignmentsRes, assistantsRes] = await Promise.all([
        studioControllerListAssignments(params, { signal }),
        usersControllerListAssistants({ limit: 100, offset: 0 }, { signal })
      ])

      if (signal.aborted) return

      const assignments = assignmentsRes.data.items ?? []
      const totalCount = assignmentsRes.data.total
      const assistants = assistantsRes.data.items ?? []
      const byId = new Map(assistants.map((a) => [a.userId, a]))

      setItems(assignments.map((assignment) => ({ assignment, assistant: byId.get(assignment.assistantId) ?? null })))
      setTotal(totalCount)
    },
    []
  )

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const signal = controller.signal

    setIsLoading(true)
    setError(null)

    ;(async () => {
      try {
        await fetchAll(signal, page, status)
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
  }, [page, status, reloadToken, fetchAll, t])

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