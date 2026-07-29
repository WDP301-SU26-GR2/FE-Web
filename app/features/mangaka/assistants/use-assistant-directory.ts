import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usersControllerListAssistants } from '~/api/operations/users/users'
import type { UsersControllerListAssistantsParams } from '~/api/model/users/usersControllerListAssistantsParams'
import type { AssistantDirectoryListResDtoOutputItemsItem } from '~/api/model/users'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export const ASSISTANT_PAGE_SIZE = 8

type Specialization = NonNullable<UsersControllerListAssistantsParams['specialization']>

type UseAssistantDirectoryResult = {
  items: AssistantDirectoryListResDtoOutputItemsItem[]
  total: number
  page: number
  perPage: number
  isLoading: boolean
  error: string | null
  setPage: (page: number) => void
  setSpecialization: (spec: Specialization | undefined) => void
  specialization: Specialization | undefined
  refresh: () => void
}

/**
 * Paginated fetch for the Mangaka assistant directory (`GET /assistants`).
 *
 * Mirrors the `useSeriesList` pattern: AbortController for stale requests,
 * a 1-based `page` for the UI, `total` from the BE for pagination sizing.
 * An optional specialization filter is sent as a query param (omit = "no
 * filter" per FE-API-Guide-v2.md §4.3).
 *
 * Per §4.3, 403/404 on the directory endpoint is treated as "empty" rather
 * than a hard error — the page can still render a graceful no-access state.
 */
export function useAssistantDirectory(): UseAssistantDirectoryResult {
  const { t } = useTranslation('common')
  const [items, setItems] = useState<AssistantDirectoryListResDtoOutputItemsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPageState] = useState(1)
  const [specialization, setSpecialization] = useState<Specialization | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const abortRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(
    async (targetPage: number, spec: Specialization | undefined) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const signal = controller.signal

      setIsLoading(true)
      setError(null)

      const offset = (targetPage - 1) * ASSISTANT_PAGE_SIZE

      try {
        const params: UsersControllerListAssistantsParams = {
          limit: ASSISTANT_PAGE_SIZE,
          offset
        }
        if (spec) params.specialization = spec

        const res = await usersControllerListAssistants(params, { signal })
        if (!signal.aborted) {
          setItems(res.data.items)
          setTotal(res.data.total)
        }
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        if (isFetchError(err) && (err.status === 403 || err.status === 404)) {
          // No access or empty scope — render an empty directory, not a hard error.
          setItems([])
          setTotal(0)
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPage(page, specialization)
    return () => abortRef.current?.abort()
  }, [page, specialization, reloadToken, fetchPage])

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next))
  }, [])

  const changeSpecialization = useCallback((next: Specialization | undefined) => {
    setPageState(1)
    setSpecialization(next)
  }, [])

  const refresh = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  return {
    items,
    total,
    page,
    perPage: ASSISTANT_PAGE_SIZE,
    isLoading,
    error,
    setPage,
    setSpecialization: changeSpecialization,
    specialization,
    refresh
  }
}
