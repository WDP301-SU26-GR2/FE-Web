import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { revisionControllerList, revisionControllerResolve } from '~/api/operations/revision/revision'
import {
  RevisionControllerListIsResolved,
  RevisionControllerListTargetType,
  type RevisionRequestListResDtoOutput,
  type RevisionRequestListResDtoOutputItemsItem
} from '~/api/model/revision'

type UseProposalRevisionsResult = {
  revisions: RevisionRequestListResDtoOutputItemsItem[]
  isLoadingRevisions: boolean
  resolvingRevisionId: string | null
  resolveRevision: (revisionId: string) => Promise<boolean>
  refreshRevisions: () => void
}

/** Loads the unresolved Editor feedback rounds for proposal metadata and its sample Name. */
export function useProposalRevisions(seriesId: string, nameId?: string | null): UseProposalRevisionsResult {
  const { t } = useTranslation('mangaka')
  const [revisions, setRevisions] = useState<RevisionRequestListResDtoOutputItemsItem[]>([])
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [resolvingRevisionId, setResolvingRevisionId] = useState<string | null>(null)

  useEffect(() => {
    if (!seriesId) return
    const controller = new AbortController()

    ;(async () => {
      setIsLoadingRevisions(true)
      try {
        const requests = [
          revisionControllerList(
            {
              targetType: RevisionControllerListTargetType.PROPOSAL,
              targetId: seriesId,
              isResolved: RevisionControllerListIsResolved.false,
              limit: 100,
              offset: 0
            },
            { signal: controller.signal }
          )
        ]
        if (nameId) {
          requests.push(
            revisionControllerList(
              {
                targetType: RevisionControllerListTargetType.NAME,
                targetId: nameId,
                isResolved: RevisionControllerListIsResolved.false,
                limit: 100,
                offset: 0
              },
              { signal: controller.signal }
            )
          )
        }
        const responses = await Promise.all(requests)
        if (!controller.signal.aborted) {
          setRevisions(
            responses
              .flatMap((response) => (response.data as RevisionRequestListResDtoOutput).items)
              .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          )
        }
      } catch (error) {
        if (!controller.signal.aborted && !(error instanceof Error && error.name === 'AbortError')) {
          setRevisions([])
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingRevisions(false)
      }
    })()

    return () => controller.abort()
  }, [seriesId, nameId, reloadToken])

  const refreshRevisions = useCallback(() => setReloadToken((value) => value + 1), [])

  const resolveRevision = useCallback(
    async (revisionId: string) => {
      setResolvingRevisionId(revisionId)
      try {
        await revisionControllerResolve({ id: revisionId })
        toast.success(t('seriesDetail.revisions.resolveSuccess'))
        refreshRevisions()
        return true
      } catch {
        toast.error(t('seriesDetail.revisions.resolveError'))
        return false
      } finally {
        setResolvingRevisionId(null)
      }
    },
    [refreshRevisions, t]
  )

  return { revisions, isLoadingRevisions, resolvingRevisionId, resolveRevision, refreshRevisions }
}
