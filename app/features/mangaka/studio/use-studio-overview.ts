import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { StudioOverviewResDtoOutputItemsItem } from '~/api/model/studio'
import { studioOverviewControllerOverview } from '~/api/operations/studio/studio'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

const WARNING_PRIORITY: Record<StudioOverviewResDtoOutputItemsItem['warningLevel'], number> = {
  CRITICAL: 0,
  RED: 1,
  YELLOW: 2,
  NONE: 3
}

export interface UseStudioOverviewResult {
  items: StudioOverviewResDtoOutputItemsItem[]
  isLoading: boolean
  error: string | null
  refresh: () => void
}

/**
 * Reads the Mangaka-only production overview. The API already returns its
 * items by warning severity; the local sort makes that contract resilient and
 * breaks equal-severity ties by their nearest deadline.
 */
export function useStudioOverview(): UseStudioOverviewResult {
  const { t } = useTranslation('mangaka')
  const [items, setItems] = useState<StudioOverviewResDtoOutputItemsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadOverview() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await studioOverviewControllerOverview({ signal: controller.signal })
        if (!controller.signal.aborted) setItems(response.data.items ?? [])
      } catch (cause) {
        if (controller.signal.aborted) return

        const message = extractApiErrorMessage(cause, t('studio.overview.error.loadFailed')).trim()
        setError(/^error[.:]/i.test(message) ? t('studio.overview.error.loadFailed') : message)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadOverview()
    return () => controller.abort()
  }, [refreshToken, t])

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), [])

  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const warningDifference = WARNING_PRIORITY[left.warningLevel] - WARNING_PRIORITY[right.warningLevel]
        if (warningDifference !== 0) return warningDifference

        const leftDeadline = left.deadline ? Date.parse(left.deadline) : Number.POSITIVE_INFINITY
        const rightDeadline = right.deadline ? Date.parse(right.deadline) : Number.POSITIVE_INFINITY
        return leftDeadline - rightDeadline
      }),
    [items]
  )

  return { items: sortedItems, isLoading, error, refresh }
}
