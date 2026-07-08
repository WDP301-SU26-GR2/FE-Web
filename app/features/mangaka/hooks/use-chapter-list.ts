import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { chapterControllerListBySeries } from '~/api/operations/chapters/chapters'
import type { ChapterListResDtoOutputItemsItem } from '~/api/model/chapters'
import { isFetchError } from '~/api/mutator/custom-fetch'

type UseChapterListResult = {
  chapters: ChapterListResDtoOutputItemsItem[]
  isLoading: boolean
  error: string | null
  refresh: () => void
}

/**
 * Fetch the chapter list for a given series via `GET /chapters?seriesId=...`.
 *
 * - Cancels stale requests when `seriesId` changes or the component unmounts.
 * - 200 with `{ items: [] }` is a normal "no chapters yet" — not an error.
 * - Other errors are surfaced as a translated fallback string.
 */
export function useChapterList(seriesId: string | null | undefined): UseChapterListResult {
  const { t } = useTranslation('mangaka')
  const [chapters, setChapters] = useState<ChapterListResDtoOutputItemsItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const abortRef = useRef<AbortController | null>(null)

  const fetchList = useCallback(
    async (sid: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const signal = controller.signal

      setIsLoading(true)
      setError(null)

      try {
        const res = await chapterControllerListBySeries({ seriesId: sid }, { signal })
        if (signal.aborted) return
        const items = (res.data as { items: ChapterListResDtoOutputItemsItem[] }).items ?? []
        // Sort by chapterNumber ascending so the list reads top-to-bottom in
        // publication order.
        const sorted = [...items].sort((a, b) => a.chapterNumber - b.chapterNumber)
        setChapters(sorted)
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        // 403/404 for chapter listing is treated as "no access" — show empty
        // state, not the generic error block, because the section itself
        // will already gate access to the series owner.
        if (isFetchError(err) && (err.status === 403 || err.status === 404)) {
          setChapters([])
        } else {
          setError(err instanceof Error ? err.message : t('seriesDetail.publication.error.loadFailed'))
        }
      }
      if (!signal.aborted) {
        setIsLoading(false)
      }
    },
    [t]
  )

  useEffect(() => {
    if (!seriesId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChapters([])
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false)
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchList(seriesId)
    return () => abortRef.current?.abort()
  }, [seriesId, reloadToken, fetchList])

  const refresh = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  return { chapters, isLoading, error, refresh }
}
