import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { annotationControllerList } from '~/api/operations/annotations/annotations'
import type {
  AnnotationListResDtoOutput,
  AnnotationResDtoOutput
} from '~/api/model/annotations'
import { isFetchError } from '~/api/mutator/custom-fetch'

type UsePageAnnotationsResult = {
  annotations: AnnotationResDtoOutput[]
  isLoading: boolean
  /** Re-fetch (used after a refresh of the page / when annotations land via WebSocket). */
  refresh: () => void
}

/**
 * Fetch annotations anchored to a page (`targetType = "PAGE"`, `targetId = page.id`).
 *
 * Page annotations typically come from Editor reviews during EDITOR_REVIEW or
 * EDITOR_REVISION states (see FE-API-Guide-v3 §5). Mangaka uses them as inline
 * feedback. We deliberately don't filter by `isResolved` here — open + resolved
 * annotations render in the right rail for full context.
 *
 * The fetch effect mirrors the legacy pattern in `useChapter`, `useChapterName`
 * and `useChapterPages` — call setState from within an async continuation of
 * the effect (not from synchronous effect body), so React 19's strict-set-state
 * check in `eslint-plugin-react-hooks` v7 accepts the cascade as a legitimate
 * external state sync rather than a render-time update.
 */
export function usePageAnnotations(
  pageId: string | null | undefined
): UsePageAnnotationsResult {
  const { t } = useTranslation('mangaka')
  const [items, setItems] = useState<AnnotationResDtoOutput[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const signal = controller.signal

    if (!pageId) {
      // Synchronous setState is intentional — clearing the list before any
      // async work kicks off prevents the rail from showing stale annotations
      // when the user moves to a new page.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems([])
      setIsLoading(false)
      return () => {
        cancelled = true
        controller.abort()
      }
    }

    setIsLoading(true)

    void (async () => {
      try {
        const res = await annotationControllerList(
          { targetType: 'PAGE', targetId: pageId },
          { signal }
        )
        if (cancelled || signal.aborted) return
        const list = (res.data as AnnotationListResDtoOutput).items ?? []
        const sorted = [...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        setItems(sorted as AnnotationResDtoOutput[])
      } catch (err: unknown) {
        if (cancelled || signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        if (isFetchError(err) && (err.status === 422 || err.status === 404)) {
          setItems([])
          return
        }
        // For anything else, swallow — keep previous list so we don't blank
        // the rail on a transient failure. The reader intentionally suppresses
        // error toasts while the user is reading.
        void t
      } finally {
        if (!cancelled && !signal.aborted) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [pageId, reloadToken, t])

  const refresh = useCallback(() => {
    setReloadToken((n) => n + 1)
  }, [])

  return { annotations: items, isLoading, refresh }
}
