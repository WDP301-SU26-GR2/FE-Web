import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { InviteListResDtoOutputItemsItem, StudioControllerListInvitesStatus } from '~/api/model/studio'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { studioControllerCancelInvite, studioControllerListInvites } from '~/api/operations/studio/studio'
import { extractApiErrorCode, extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export const OUTGOING_INVITES_PAGE_SIZE = 20

export type OutgoingInviteFilter = StudioControllerListInvitesStatus | undefined

type UseMangakaOutgoingInvitesResult = {
  items: InviteListResDtoOutputItemsItem[]
  total: number
  page: number
  perPage: number
  isLoading: boolean
  error: string | null
  status: OutgoingInviteFilter
  setStatus: (status: OutgoingInviteFilter) => void
  setPage: (page: number) => void
  refresh: () => void
  cancelInvite: (invite: InviteListResDtoOutputItemsItem) => Promise<boolean>
  isCancelling: boolean
}

function getSafeErrorMessage(error: unknown, fallback: string): string {
  const message = extractApiErrorMessage(error, fallback)
  return message.startsWith('Error.') ? fallback : message
}

/**
 * Lists the current Mangaka's outbound collaboration invites and owns the
 * PENDING -> CANCELLED transition. The backend scopes both endpoints to the
 * authenticated caller, so no user id is sent from the browser.
 */
export function useMangakaOutgoingInvites(): UseMangakaOutgoingInvitesResult {
  const { t } = useTranslation('mangaka')
  const [items, setItems] = useState<InviteListResDtoOutputItemsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPageState] = useState(1)
  const [status, setStatus] = useState<OutgoingInviteFilter>('PENDING')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [isCancelling, setIsCancelling] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const cancellationRef = useRef(false)

  const refresh = useCallback(() => {
    setReloadToken((value) => value + 1)
  }, [])

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)
    ;(async () => {
      try {
        const response = await studioControllerListInvites(
          {
            limit: OUTGOING_INVITES_PAGE_SIZE,
            offset: (page - 1) * OUTGOING_INVITES_PAGE_SIZE,
            ...(status ? { status } : {})
          },
          { signal: controller.signal }
        )
        if (controller.signal.aborted) return

        setItems(response.data?.items ?? [])
        setTotal(response.data?.total ?? 0)
        if ((response.data?.items?.length ?? 0) === 0 && page > 1) {
          setPageState((current) => Math.max(1, current - 1))
        }
      } catch (requestError: unknown) {
        if (controller.signal.aborted || (requestError instanceof Error && requestError.name === 'AbortError')) {
          return
        }
        setItems([])
        setTotal(0)
        setError(getSafeErrorMessage(requestError, t('outgoingInvites.error.loadFailed')))
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [page, reloadToken, status, t])

  const setStatusFilter = useCallback((nextStatus: OutgoingInviteFilter) => {
    setStatus(nextStatus)
    setPageState(1)
  }, [])

  const setPage = useCallback((nextPage: number) => {
    setPageState(Math.max(1, nextPage))
  }, [])

  const cancelInvite = useCallback(
    async (invite: InviteListResDtoOutputItemsItem): Promise<boolean> => {
      if (invite.status !== 'PENDING') {
        toast.error(t('outgoingInvites.error.notPending'))
        return false
      }
      if (cancellationRef.current) return false

      cancellationRef.current = true
      setIsCancelling(true)
      try {
        await studioControllerCancelInvite({ id: invite.id })
        toast.success(t('outgoingInvites.success.cancelled'))
        refresh()
        return true
      } catch (requestError: unknown) {
        const code = extractApiErrorCode(requestError)
        if (code === 'Error.InviteNotPending' || (isFetchError(requestError) && requestError.status === 409)) {
          toast.error(t('outgoingInvites.error.notPending'))
        } else if (code === 'Error.NotInviteOwner' || (isFetchError(requestError) && requestError.status === 403)) {
          toast.error(t('outgoingInvites.error.notOwner'))
        } else if (code === 'Error.InviteNotFound' || (isFetchError(requestError) && requestError.status === 404)) {
          toast.error(t('outgoingInvites.error.notFound'))
        } else {
          toast.error(getSafeErrorMessage(requestError, t('outgoingInvites.error.cancelFailed')))
        }
        return false
      } finally {
        cancellationRef.current = false
        setIsCancelling(false)
      }
    },
    [refresh, t]
  )

  return {
    items,
    total,
    page,
    perPage: OUTGOING_INVITES_PAGE_SIZE,
    isLoading,
    error,
    status,
    setStatus: setStatusFilter,
    setPage,
    refresh,
    cancelInvite,
    isCancelling
  }
}
