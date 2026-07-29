import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { chapterNameControllerGetOne, chapterNameControllerList } from '~/api/operations/names/names'
import type { NameListResDtoOutput, NameListResDtoOutputItemsItem } from '~/api/model/names'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type UseChapterNameResult = {
  name: NameListResDtoOutputItemsItem | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

/**
 * Fetch the per-chapter Name (storyboard) at `GET /chapters/:id/names`
 * via the **chapter-scoped** Orval client (`chapterNameControllerList`).
 *
 * Why chapter-scoped? Per FE-API-Guide §12 the routes are split:
 *   - `nameController*`        → `/series/:id/names/*`   (proposal-Name only)
 *   - `chapterNameController*` → `/chapters/:id/names/*` (chapter-Name — what
 *                                 Publication Workbench manages)
 * Calling the series-scoped client with a chapter id hits `/series/:id/names`
 * which would 404 because the BE looks up a *series* by that id.
 *
 * Endpoint returns 0..1 Name items per the chapter-first model (§5 of
 * FE-API-Guide-v3): 409 `Error.ChapterNameAlreadyExists` would mean someone
 * already created one — we still surface the only item. Fetch is cancellable
 * per chapterId change + unmount.
 */
export function useChapterName(chapterId: string | null | undefined): UseChapterNameResult {
  const { t } = useTranslation('mangaka')
  const [name, setName] = useState<NameListResDtoOutputItemsItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const abortRef = useRef<AbortController | null>(null)

  const fetchName = useCallback(
    async (cid: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const signal = controller.signal

      setIsLoading(true)
      setError(null)

      try {
        const res = await chapterNameControllerList({ id: cid }, { signal })
        if (signal.aborted) return
        const items = (res.data as NameListResDtoOutput).items ?? []
        // Per chapter-first model: at most one Name per chapter. If for some
        // reason multiple are returned, prefer the most recent (latest
        // submittedAt, then largest version).
        const sorted = [...items].sort((a, b) => {
          const sa = a.submittedAt ? Date.parse(a.submittedAt) : 0
          const sb = b.submittedAt ? Date.parse(b.submittedAt) : 0
          if (sa !== sb) return sb - sa
          return b.version - a.version
        })
        const selected = sorted[0]
        if (!selected) {
          setName(null)
        } else {
          const detail = await chapterNameControllerGetOne({ id: cid, nameId: selected.id }, { signal })
          if (!signal.aborted) {
            setName(detail.data as unknown as NameListResDtoOutputItemsItem)
          }
        }
      } catch (err: unknown) {
        if (signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        if (isFetchError(err) && (err.status === 403 || err.status === 404)) {
          setName(null)
        } else {
          setError(extractApiErrorMessage(err, t('publication.error.generic')))
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
      setName(null)
      return
    }
    void fetchName(chapterId)
    return () => abortRef.current?.abort()
  }, [chapterId, reloadToken, fetchName])

  const refresh = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  return { name, isLoading, error, refresh }
}
