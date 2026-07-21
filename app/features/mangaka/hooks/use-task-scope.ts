import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { seriesControllerListSeries } from '~/api/operations/series/series'
import type { SeriesResDtoOutput } from '~/api/model/series/seriesResDtoOutput'
import { chapterControllerListBySeries, chapterControllerListPages } from '~/api/operations/chapters/chapters'
import type { ChapterResDtoOutput } from '~/api/model/chapters/chapterResDtoOutput'
import type { PageResDtoOutput } from '~/api/model/chapters/pageResDtoOutput'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

/**
 * Series → Chapter → Page cascade hooks used by Mangaka-only scoped UIs
 * (Studio tasks, Publication section, …). Each hook is independent so callers
 * can compose them, but every one owns the loading + abort plumbing for its
 * own request.
 *
 * All three share the same shape:
 *   `{ items, isLoading, error, reload? }`
 *
 * The series list is loaded once on mount + on `reload()`. Switching
 * `seriesId` triggers a `chapters` refetch; switching `chapterId` triggers a
 * `pages` refetch. `useMangakaChapterList` and `useMangakaChapterPages` key
 * the fetch on the argument rather than a `reloadToken`.
 */

export type SeriesLite = Pick<SeriesResDtoOutput, 'id' | 'title'>

export function useMangakaSeriesList(): {
  items: SeriesLite[]
  isLoading: boolean
  error: string | null
  reload: () => void
} {
  const { t } = useTranslation('mangaka')
  const [items, setItems] = useState<SeriesLite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    // Defer initial-state setState to next microtask (avoids
    // `react-hooks/set-state-in-effect` — a synchronous setState immediately
    // after `new AbortController()` triggers a cascading render).
    Promise.resolve().then(() => {
      setIsLoading(true)
      setError(null)
    })
    void (async () => {
      try {
        const res = await seriesControllerListSeries({ limit: 100 }, { signal: ctrl.signal })
        if (ctrl.signal.aborted) return
        const data = res.data
        const list = (data?.items ?? []).map((s) => ({ id: s.id, title: s.title }))
        setItems(list)
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return
        if (ctrl.signal.aborted) return
        if (isFetchError(err) && err.status === 403) {
          setItems([])
        } else {
          setError(extractApiErrorMessage(err, t('studio.tasksTab.errors.loadSeriesFailed')))
        }
      } finally {
        if (!ctrl.signal.aborted) setIsLoading(false)
      }
    })()
    return () => ctrl.abort()
  }, [reloadToken, t])

  const reload = useCallback(() => setReloadToken((n) => n + 1), [])
  return { items, isLoading, error, reload }
}

export type ChapterLite = Pick<ChapterResDtoOutput, 'id' | 'seriesId' | 'chapterNumber' | 'title'>

export function useMangakaChapterList(seriesId: string | null | undefined): {
  items: ChapterLite[]
  isLoading: boolean
  error: string | null
} {
  const { t } = useTranslation('mangaka')
  const [items, setItems] = useState<ChapterLite[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    if (!seriesId) {
      Promise.resolve().then(() => {
        setItems([])
        setIsLoading(false)
      })
      return
    }
    const ctrl = new AbortController()
    abortRef.current = ctrl
    Promise.resolve().then(() => {
      setIsLoading(true)
      setError(null)
    })
    void (async () => {
      try {
        const res = await chapterControllerListBySeries({ seriesId }, { signal: ctrl.signal })
        if (ctrl.signal.aborted) return
        const list = (res.data?.items ?? []).map((c) => ({
          id: c.id,
          seriesId: c.seriesId,
          chapterNumber: c.chapterNumber,
          title: c.title
        }))
        setItems(list)
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return
        if (ctrl.signal.aborted) return
        if (isFetchError(err) && (err.status === 403 || err.status === 404)) {
          setItems([])
        } else {
          setError(extractApiErrorMessage(err, t('studio.tasksTab.errors.loadChaptersFailed')))
        }
      } finally {
        if (!ctrl.signal.aborted) setIsLoading(false)
      }
    })()
    return () => ctrl.abort()
  }, [seriesId, t])

  return { items, isLoading, error }
}

export function useMangakaChapterPages(chapterId: string | null | undefined): {
  items: PageResDtoOutput[]
  isLoading: boolean
  error: string | null
} {
  const { t } = useTranslation('mangaka')
  const [items, setItems] = useState<PageResDtoOutput[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    if (!chapterId) {
      Promise.resolve().then(() => {
        setItems([])
        setIsLoading(false)
      })
      return
    }
    const ctrl = new AbortController()
    abortRef.current = ctrl
    Promise.resolve().then(() => {
      setIsLoading(true)
      setError(null)
    })
    void (async () => {
      try {
        const res = await chapterControllerListPages({ id: chapterId }, { signal: ctrl.signal })
        if (ctrl.signal.aborted) return
        const list = res.data?.items ?? []
        setItems(list)
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return
        if (ctrl.signal.aborted) return
        if (isFetchError(err) && (err.status === 403 || err.status === 404)) {
          setItems([])
        } else {
          setError(extractApiErrorMessage(err, t('studio.tasksTab.errors.loadPagesFailed')))
        }
      } finally {
        if (!ctrl.signal.aborted) setIsLoading(false)
      }
    })()
    return () => ctrl.abort()
  }, [chapterId, t])

  return { items, isLoading, error }
}
