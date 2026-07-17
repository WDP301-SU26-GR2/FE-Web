import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { revisionControllerList, revisionControllerResolve } from '~/api/operations/revision/revision'
import {
  RevisionControllerListTargetType,
  type RevisionRequestListResDtoOutput,
  type RevisionRequestListResDtoOutputItemsItem
} from '~/api/model/revision'
import type { RevisionControllerListParams } from '~/api/model/revision/revisionControllerListParams'

const PAGE_SIZE = 4

type UseRevisionRequestsDrawerResult = {
  items: RevisionRequestListResDtoOutputItemsItem[]
  isLoading: boolean
  error: string | null
  page: number
  totalPages: number
  setPage: (n: number) => void
  paginatedItems: RevisionRequestListResDtoOutputItemsItem[]
  resolvingId: string | null
  resolve: (item: RevisionRequestListResDtoOutputItemsItem) => Promise<void>
  refresh: () => void
}

async function fetchAllForScope(
  seriesId: string,
  nameId: string | null | undefined,
  signal: AbortSignal
): Promise<RevisionRequestListResDtoOutputItemsItem[]> {
  const baseParams: RevisionControllerListParams = { limit: 100, offset: 0 }
  const requests = [
    revisionControllerList(
      { ...baseParams, targetType: RevisionControllerListTargetType.PROPOSAL, targetId: seriesId },
      { signal }
    )
  ]
  if (nameId) {
    requests.push(
      revisionControllerList(
        { ...baseParams, targetType: RevisionControllerListTargetType.NAME, targetId: nameId },
        { signal }
      )
    )
  }
  const responses = await Promise.all(requests)
  const items = responses.flatMap(
    (res) => (res.data as RevisionRequestListResDtoOutput).items ?? []
  )
  return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

/**
 * Loads the combined revision-request history for a series (PROPOSAL scope) +
 * its proposal-Name (NAME scope) and exposes it with local pagination (4
 * per page). `open === false` skips fetching but keeps the previously loaded
 * data so reopening the drawer is instant.
 */
export function useRevisionRequestsDrawer(
  open: boolean,
  seriesId: string,
  nameId: string | null | undefined
): UseRevisionRequestsDrawerResult {
  const { t } = useTranslation('mangaka')
  const [items, setItems] = useState<RevisionRequestListResDtoOutputItemsItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (!open || !seriesId) return
    const controller = new AbortController()
    // Reset pagination when the user re-opens the drawer or when the
    // underlying series/name changes — same pattern as the other data
    // hooks in this slice (see use-chapter-list.ts).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(0)
    ;(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchAllForScope(seriesId, nameId, controller.signal)
        if (!controller.signal.aborted) setItems(result)
      } catch (err) {
        if (controller.signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        setError(
          extractApiErrorMessage(err, t('seriesDetail.revisions.drawer.error.loadFailed'))
        )
        setItems([])
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()
    return () => controller.abort()
  }, [open, seriesId, nameId, reloadToken, t])

  const refresh = useCallback(() => setReloadToken((v) => v + 1), [])

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))

  const paginatedItems = useMemo(
    () => items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [items, page]
  )

  const resolve = useCallback(
    async (item: RevisionRequestListResDtoOutputItemsItem) => {
      setResolvingId(item.id)
      try {
        await revisionControllerResolve({ id: item.id })
        // Optimistic local flip so the UI updates instantly without waiting
        // for the deferred re-fetch (which only re-syncs resolvedAt/By).
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, isResolved: true } : it))
        )
        toast.success(t('seriesDetail.revisions.resolveSuccess'))
        setTimeout(() => setReloadToken((v) => v + 1), 50)
      } catch (err) {
        toast.error(
          err instanceof Error && err.message
            ? err.message
            : t('seriesDetail.revisions.resolveError')
        )
      } finally {
        setResolvingId(null)
      }
    },
    [t]
  )

  return {
    items,
    isLoading,
    error,
    page,
    totalPages,
    setPage,
    paginatedItems,
    resolvingId,
    resolve,
    refresh
  }
}
