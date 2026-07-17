import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  studioControllerAcceptInvite,
  studioControllerDeclineInvite,
  studioControllerListInvites
} from '~/api/operations/studio/studio'
import type { StudioControllerListInvitesParams } from '~/api/model/studio/studioControllerListInvitesParams'
import type { StudioControllerListInvitesStatus } from '~/api/model/studio/studioControllerListInvitesStatus'
import type { InviteListResDtoOutputItemsItem } from '~/api/model/studio'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export const INVITES_PAGE_SIZE = 8

export type InviteFilterStatus = StudioControllerListInvitesStatus | undefined

type UseAssistantInvitesResult = {
  items: InviteListResDtoOutputItemsItem[]
  total: number
  page: number
  perPage: number
  isLoading: boolean
  error: string | null
  status: InviteFilterStatus
  setStatus: (status: InviteFilterStatus) => void
  setPage: (page: number) => void
  refresh: () => void
  acceptInvite: (id: string) => Promise<boolean>
  declineInvite: (id: string) => Promise<boolean>
  isMutating: boolean
}

/**
 * Paginated list of collaboration invites received by the current Assistant,
 * plus the Accept / Decline actions.
 *
 * - List: `GET /collaboration-invites?status=...&limit=...&offset=...`
 *   (scoped to the caller — Assistant sees only invites where they're the invitee)
 * - Accept: `POST /collaboration-invites/{id}/accept` → 201 returns new
 *   StudioAssignment ACTIVE; FE only needs to re-fetch the list.
 * - Decline: `POST /collaboration-invites/{id}/decline` → 201 returns the
 *   declined invite; FE re-fetches the list.
 *
 * On 409 from accept/decline (state machine mismatch, e.g. invite already
 * expired/cancelled) the BE error message is surfaced via the generic
 * `acceptFailed` / `declineFailed` toasts — no special-case translation here
 * since the BE envelope `message` is already human-readable.
 */
export function useAssistantInvites(): UseAssistantInvitesResult {
  const { t } = useTranslation('assistant')
  const [items, setItems] = useState<InviteListResDtoOutputItemsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPageState] = useState(1)
  const [status, setStatus] = useState<InviteFilterStatus>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [isMutating, setIsMutating] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(
    async (signal: AbortSignal, targetPage: number, currentStatus: InviteFilterStatus): Promise<void> => {
      const offset = (targetPage - 1) * INVITES_PAGE_SIZE
      const params: StudioControllerListInvitesParams = {
        limit: INVITES_PAGE_SIZE,
        offset
      }
      if (currentStatus) params.status = currentStatus

      const res = await studioControllerListInvites(params, { signal })
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
          setError(extractApiErrorMessage(err, t('invites.error.loadFailed')))
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

  const acceptInvite = useCallback(
    async (id: string): Promise<boolean> => {
      setIsMutating(true)
      try {
        await studioControllerAcceptInvite({ id })
        toast.success(t('invites.success.accepted'))
        setReloadToken((n) => n + 1)
        return true
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('invites.error.acceptFailed')))
        return false
      } finally {
        setIsMutating(false)
      }
    },
    [t]
  )

  const declineInvite = useCallback(
    async (id: string): Promise<boolean> => {
      setIsMutating(true)
      try {
        await studioControllerDeclineInvite({ id })
        toast.success(t('invites.success.declined'))
        setReloadToken((n) => n + 1)
        return true
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('invites.error.declineFailed')))
        return false
      } finally {
        setIsMutating(false)
      }
    },
    [t]
  )

  return {
    items,
    total,
    page,
    perPage: INVITES_PAGE_SIZE,
    isLoading,
    error,
    status,
    setStatus,
    setPage,
    refresh,
    acceptInvite,
    declineInvite,
    isMutating
  }
}
