import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { revisionControllerList, revisionControllerResolve } from '~/api/operations/revision/revision'
import {
  RevisionControllerListTargetType,
  type RevisionRequestListResDtoOutput,
  type RevisionRequestListResDtoOutputItemsItem
} from '~/api/model/revision'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export type UseStoryboardRevisionsResult = {
  revisions: RevisionRequestListResDtoOutputItemsItem[]
  isLoading: boolean
  error: string | null
  resolvingRevisionId: string | null
  resolveRevision: (revisionId: string) => Promise<boolean>
  refreshRevisions: () => void
}

/** Loads all Editor revision rounds for one chapter storyboard (Name). */
export function useStoryboardRevisions(storyboardId: string | null | undefined): UseStoryboardRevisionsResult {
  const { t } = useTranslation('mangaka')
  const [revisions, setRevisions] = useState<RevisionRequestListResDtoOutputItemsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [resolvingRevisionId, setResolvingRevisionId] = useState<string | null>(null)

  useEffect(() => {
    if (!storyboardId) return

    const controller = new AbortController()
    void (async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await revisionControllerList(
          {
            targetType: RevisionControllerListTargetType.STORYBOARD,
            targetId: storyboardId,
            limit: 100,
            offset: 0
          },
          { signal: controller.signal }
        )
        if (!controller.signal.aborted) {
          const items = (response.data as RevisionRequestListResDtoOutput).items ?? []
          setRevisions([...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)))
        }
      } catch (cause) {
        if (!controller.signal.aborted && !(cause instanceof Error && cause.name === 'AbortError')) {
          setError(extractApiErrorMessage(cause, t('seriesDetail.revisions.drawer.error.loadFailed')))
          setRevisions([])
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [storyboardId, reloadToken, t])

  const refreshRevisions = useCallback(() => setReloadToken((value) => value + 1), [])

  const resolveRevision = useCallback(
    async (revisionId: string) => {
      setResolvingRevisionId(revisionId)
      try {
        await revisionControllerResolve({ id: revisionId })
        setRevisions((items) => items.map((item) => (item.id === revisionId ? { ...item, isResolved: true } : item)))
        toast.success(t('seriesDetail.revisions.resolveSuccess'))
        return true
      } catch (cause) {
        toast.error(extractApiErrorMessage(cause, t('seriesDetail.revisions.resolveError')))
        return false
      } finally {
        setResolvingRevisionId(null)
      }
    },
    [t]
  )

  return { revisions, isLoading, error, resolvingRevisionId, resolveRevision, refreshRevisions }
}
