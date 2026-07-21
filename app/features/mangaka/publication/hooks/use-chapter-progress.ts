import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { chapterControllerProgress } from '~/api/operations/chapters/chapters'
import type { ChapterProgressResDtoOutput } from '~/api/model/chapters'
import { isFetchError } from '~/api/mutator/custom-fetch'

type UseChapterProgressResult = {
  progress: ChapterProgressResDtoOutput | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

/**
 * Fetch chapter production progress (`GET /chapters/:id/progress`).
 *
 * Per FE-API-Guide-v3 §5 step 10:
 *   - `pagesReady` / `pagesPending` are derived from Task status by the BE.
 *   - A page is "ready" when all its non-CANCELLED Tasks are APPROVED.
 *   - This is the canonical source for gating submit-manuscript decisions.
 *
 * NOTE: The hook uses a reload token so callers can trigger refresh without
 * prop-drilling a callback.
 */
export function useChapterProgress(chapterId: string | null | undefined): UseChapterProgressResult {
  const { t } = useTranslation('mangaka')
  const [progress, setProgress] = useState<ChapterProgressResDtoOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const abortRef = useRef<AbortController | null>(null)

  const fetch = useCallback(
    async (id: string) => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const signal = ctrl.signal

      setIsLoading(true)
      setError(null)

      try {
        const res = await chapterControllerProgress({ id }, { signal })
        if (signal.aborted) return
        setProgress(res.data as ChapterProgressResDtoOutput)
      } catch (err) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        if (isFetchError(err) && err.status === 403) {
          // Mangaka not the series owner — progress not accessible
          setProgress(null)
        } else {
          setError(err instanceof Error ? err.message : t('publication.error.generic'))
          setProgress(null)
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
        }
      }
    },
    [t]
  )

  useEffect(() => {
    if (!chapterId) {
      setProgress(null)
      setError(null)
      return
    }
    void fetch(chapterId)
    return () => abortRef.current?.abort()
  }, [chapterId, reloadToken, fetch])

  const refresh = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  return { progress, isLoading, error, refresh }
}
