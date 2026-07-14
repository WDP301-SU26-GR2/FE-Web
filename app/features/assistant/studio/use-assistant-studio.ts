import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { studioControllerListAssignments } from '~/api/operations/studio/studio'
import type { StudioControllerListAssignmentsParams } from '~/api/model/studio/studioControllerListAssignmentsParams'
import type { StudioControllerListAssignmentsStatus } from '~/api/model/studio/studioControllerListAssignmentsStatus'
import type { AssignmentListResDtoOutputItemsItem } from '~/api/model/studio'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

export const STUDIO_PAGE_SIZE = 8

export type StudioFilterStatus = StudioControllerListAssignmentsStatus | undefined

type UseAssistantStudioResult = {
  items: AssignmentListResDtoOutputItemsItem[]
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
 * Paginated list of studio assignments belonging to the current Assistant.
 *
 * `GET /studio-assignments` automatically scopes the result set to the caller
 * (Mangaka: their hires / Assistant: their engagements). We only send the
 * optional status filter + paging.
 *
 * Note: the `mangakaId` field on each item is just an opaque UUID — there is
 * no `/mangakas` list endpoint, only `/mangakas/:userId` for a single profile,
 * so we render a `Mangaka #hash` fallback in the card. Adding per-card
 * profile hydration is a follow-up enhancement (would need a `/me/mangakas`
 * endpoint or similar from BE).
 */
export function useAssistantStudio(): UseAssistantStudioResult {
  const { t } = useTranslation('assistant')
  const [items, setItems] = useState<AssignmentListResDtoOutputItemsItem[]>([])
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
      const params: StudioControllerListAssignmentsParams = {
        limit: STUDIO_PAGE_SIZE,
        offset
      }
      if (currentStatus) params.status = currentStatus

      const res = await studioControllerListAssignments(params, { signal })
      if (signal.aborted) return

      setItems(res.data.items ?? [])
      setTotal(res.data.total)
    },
    []
  )

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
        await fetchPage(signal, page, status)
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        if (isFetchError(err) && (err.status === 403 || err.status === 404)) {
          setItems([])
          setTotal(0)
        } else {
          setError(extractApiErrorMessage(err, t('studio.error.loadFailed')))
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
