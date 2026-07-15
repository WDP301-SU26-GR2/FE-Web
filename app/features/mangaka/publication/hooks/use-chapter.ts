import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { chapterControllerGetOne } from '~/api/operations/chapters/chapters'
import type { ChapterResDtoOutput } from '~/api/model/chapters'
import { isFetchError } from '~/api/mutator/custom-fetch'

type UseChapterResult = {
  chapter: ChapterResDtoOutput | null
  isLoading: boolean
  error: string | null
  notFound: boolean
  refresh: () => void
  /** Optional: warm the cache if the consumer already loaded the chapter elsewhere. */
  setChapter: (next: ChapterResDtoOutput) => void
}

/**
 * Tiny `useChapter()` helper — fetches `/chapters/:id` and caches by id at the
 * module level so multiple consumers in the workbench don't refetch.
 *
 * - If a cached value already exists, we render it instantly and skip the
 *   network call (covers the SSR-hydrated case where the route loader
 *   prefilled the chapter).
 * - 404 → `notFound: true` for callers to render their own not-found view.
 */
let cacheByChapterId: Map<string, ChapterResDtoOutput> | null = null
function getCache(): Map<string, ChapterResDtoOutput> {
  if (!cacheByChapterId) cacheByChapterId = new Map()
  return cacheByChapterId
}

export function useChapter(id: string | null | undefined): UseChapterResult {
  const { t } = useTranslation('mangaka')
  const [chapter, setChapterRaw] = useState<ChapterResDtoOutput | null>(() => {
    if (!id) return null
    return getCache().get(id) ?? null
  })
  const [isLoading, setIsLoading] = useState(() => !(id && getCache().has(id)))
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const setChapter = useCallback((next: ChapterResDtoOutput) => {
    if (next?.id) getCache().set(next.id, next)
    setChapterRaw(next)
  }, [])

  const refresh = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    if (!id) return
    // Use cache unless explicitly asked to refresh (`reloadToken > 0`).
    if (getCache().has(id) && reloadToken === 0) return

    let cancelled = false
    const controller = new AbortController()
    const signal = controller.signal

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotFound(false)

    void chapterControllerGetOne({ id }, { signal })
      .then((res) => {
        if (cancelled || signal.aborted) return
        const payload = res.data as ChapterResDtoOutput
        getCache().set(id, payload)
        setChapterRaw(payload)
      })
      .catch((err: unknown) => {
        if (cancelled || signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        if (isFetchError(err) && err.status === 404) {
          setNotFound(true)
        } else {
          setError(err instanceof Error ? err.message : t('publication.error.generic'))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [id, reloadToken, t])

  return { chapter, isLoading, error, notFound, refresh, setChapter }
}
