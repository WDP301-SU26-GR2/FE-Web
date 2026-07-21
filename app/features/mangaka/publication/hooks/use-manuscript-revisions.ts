import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { revisionControllerList, revisionControllerResolve } from '~/api/operations/revision/revision'
import {
  RevisionControllerListTargetType,
  type RevisionRequestListResDtoOutput,
  type RevisionRequestListResDtoOutputItemsItem
} from '~/api/model/revision'

type UseManuscriptRevisionsResult = {
  revisions: RevisionRequestListResDtoOutputItemsItem[]
  isLoading: boolean
  resolvingRevisionId: string | null
  resolveRevision: (revisionId: string) => Promise<void>
}

/** Loads the revision-request history for the manuscript of one chapter. */
export function useManuscriptRevisions(chapterId: string | null | undefined): UseManuscriptRevisionsResult {
  const { t } = useTranslation('mangaka')
  const [revisions, setRevisions] = useState<RevisionRequestListResDtoOutputItemsItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [resolvingRevisionId, setResolvingRevisionId] = useState<string | null>(null)

  useEffect(() => {
    if (!chapterId) return

    const controller = new AbortController()
    void (async () => {
      setIsLoading(true)
      try {
        const response = await revisionControllerList(
          {
            targetType: RevisionControllerListTargetType.MANUSCRIPT,
            targetId: chapterId,
            limit: 100,
            offset: 0
          },
          { signal: controller.signal }
        )
        if (!controller.signal.aborted) {
          const items = (response.data as RevisionRequestListResDtoOutput).items ?? []
          setRevisions([...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)))
        }
      } catch (error) {
        if (!controller.signal.aborted && !(error instanceof Error && error.name === 'AbortError')) {
          setRevisions([])
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [chapterId])

  const resolveRevision = useCallback(
    async (revisionId: string) => {
      setResolvingRevisionId(revisionId)
      try {
        await revisionControllerResolve({ id: revisionId })
        setRevisions((items) =>
          items.map((item) => (item.id === revisionId ? { ...item, isResolved: true } : item))
        )
        toast.success(t('publication.pagesReader.revisions.resolveSuccess'))
      } catch {
        toast.error(t('publication.pagesReader.revisions.resolveError'))
      } finally {
        setResolvingRevisionId(null)
      }
    },
    [t]
  )

  return { revisions, isLoading, resolvingRevisionId, resolveRevision }
}
