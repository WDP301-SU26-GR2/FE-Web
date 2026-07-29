import { useEffect, useState } from 'react'

import type { PublicSeriesListResDtoOutputItemsItem } from '~/api/model/public'
import { publicControllerListSeries } from '~/api/operations/public/public'

export type PublicParentSeriesSearchResult = {
  items: PublicSeriesListResDtoOutputItemsItem[]
  isLoading: boolean
  hasError: boolean
}

/**
 * Search the public post-serialization catalog for a derivative proposal's
 * parent. This is deliberately not `GET /series`: that endpoint is scoped to
 * the signed-in Mangaka's own works and would hide franchise parents owned by
 * another creator.
 */
export function usePublicParentSeries(search: string): PublicParentSeriesSearchResult {
  const [items, setItems] = useState<PublicSeriesListResDtoOutputItemsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const normalizedSearch = search.trim()
    const timer = window.setTimeout(() => {
      setIsLoading(true)
      setHasError(false)

      void publicControllerListSeries(
        {
          q: normalizedSearch || undefined,
          limit: 50,
          offset: 0
        },
        { signal: controller.signal }
      )
        .then((response) => {
          if (!controller.signal.aborted) setItems(response.data.items)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) return
          setItems([])
          setHasError(true)
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false)
        })
    }, 300)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [search])

  return { items, isLoading, hasError }
}
