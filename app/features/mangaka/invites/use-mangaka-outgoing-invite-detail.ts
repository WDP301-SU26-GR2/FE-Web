import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { InviteResDtoOutput } from '~/api/model/studio'
import { studioControllerGetInvite } from '~/api/operations/studio/studio'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

interface UseMangakaOutgoingInviteDetailResult {
  invite: InviteResDtoOutput | null
  isLoading: boolean
  error: string | null
  retry: () => void
}

/** The outbound list omits taskTypes, so hydrate one invite only when its card is expanded. */
export function useMangakaOutgoingInviteDetail(inviteId: string): UseMangakaOutgoingInviteDetailResult {
  const { t } = useTranslation('mangaka')
  const [invite, setInvite] = useState<InviteResDtoOutput | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const retry = useCallback(() => {
    setReloadToken((value) => value + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)
    setInvite(null)

    void studioControllerGetInvite({ id: inviteId }, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return
        setInvite(response.data ?? null)
        if (!response.data) setError(t('outgoingInvites.detail.unavailable'))
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted || (requestError instanceof Error && requestError.name === 'AbortError')) return
        setError(extractApiErrorMessage(requestError, t('outgoingInvites.detail.loadFailed')))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [inviteId, reloadToken, t])

  return { invite, isLoading, error, retry }
}
