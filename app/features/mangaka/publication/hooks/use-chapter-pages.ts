import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { chapterControllerListPages } from '~/api/operations/chapters/chapters'
import type {
  PageListResDtoOutput,
  PageListResDtoOutputItemsItem
} from '~/api/model/chapters'
import { isFetchError } from '~/api/mutator/custom-fetch'

type UseChapterPagesResult = {
  pages: PageListResDtoOutputItemsItem[]
  isLoading: boolean
  error: string | null
  refresh: () => void
}

/**
 * Fetch the per-chapter Page list (`GET /chapters/:id/pages`) — sorted by
 * pageNumber ascending. Cancellable per chapterId change + unmount.
 */
export function useChapterPages(chapterId: string | null | undefined): UseChapterPagesResult {
  const { t } = useTranslation('mangaka')
  const [pages, setPages] = useState<PageListResDtoOutputItemsItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const abortRef = useRef<AbortController | null>(null)

  const fetchPages = useCallback(
    async (cid: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const signal = controller.signal

      setIsLoading(true)
      setError(null)

      try {
        const res = await chapterControllerListPages({ id: cid }, { signal })
        if (signal.aborted) return
        const items = ((res.data as PageListResDtoOutput).items ?? []) as PageListResDtoOutputItemsItem[]
        const sorted = [...items].sort((a, b) => a.pageNumber - b.pageNumber)
        setPages(sorted)
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        if (isFetchError(err) && err.status === 404) {
          setPages([])
        } else if (isFetchError(err) && err.status === 403) {
          setPages([])
          setError(t('publication.pagesReader.accessDenied'))
        } else {
          setError(err instanceof Error ? err.message : t('publication.error.generic'))
        }
      }
      if (!signal.aborted) {
        setIsLoading(false)
      }
    },
    [t]
  )

  useEffect(() => {
    if (!chapterId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPages([])
      return
    }
    void fetchPages(chapterId)
    return () => abortRef.current?.abort()
  }, [chapterId, reloadToken, fetchPages])

  const refresh = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  return { pages, isLoading, error, refresh }
}
