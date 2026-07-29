import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { InviteResDtoOutput } from '~/api/model/studio'
import { studioControllerGetInvite } from '~/api/operations/studio/studio'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export interface UseInviteDetailResult {
  invite: InviteResDtoOutput | null
  isLoading: boolean
  error: string | null
}

/** List results omit taskTypes; fetch the scoped detail only on request. */
export function useInviteDetail(id: string, enabled: boolean): UseInviteDetailResult {
  const { t } = useTranslation('assistant')
  const [invite, setInvite] = useState<InviteResDtoOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    void (async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await studioControllerGetInvite({ id }, { signal: controller.signal })
        if (!controller.signal.aborted) setInvite(response.data ?? null)
      } catch (err: unknown) {
        if (!controller.signal.aborted) setError(extractApiErrorMessage(err, t('invites.error.detailFailed')))
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()
    return () => controller.abort()
  }, [enabled, id, t])

  return { invite, isLoading, error }
}
