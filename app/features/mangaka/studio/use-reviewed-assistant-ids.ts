import { useCallback, useEffect, useMemo, useState } from 'react'

import { reviewsControllerListAssistantReviews } from '~/api/operations/reviews/reviews'

export function useReviewedAssistantIds(assistantIds: readonly string[], currentUserId: string | null | undefined) {
  const stableKey = [...new Set(assistantIds)].sort().join(',')
  const stableAssistantIds = useMemo(() => (stableKey ? stableKey.split(',') : []), [stableKey])
  const [reviewedAssistantIds, setReviewedAssistantIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isReliable, setIsReliable] = useState(true)

  useEffect(() => {
    if (!currentUserId || stableAssistantIds.length === 0) {
      void Promise.resolve().then(() => {
        setReviewedAssistantIds(new Set())
        setIsLoading(false)
        setIsReliable(true)
      })
      return
    }
    const controller = new AbortController()
    void (async () => {
      setIsLoading(true)
      setIsReliable(true)
      try {
        const results = await Promise.all(
          stableAssistantIds.map(async (assistantId) => {
            let offset = 0
            let page = await reviewsControllerListAssistantReviews(
              { assistantId, limit: 100, offset },
              { signal: controller.signal }
            )
            const items = [...page.data.items]
            while (page.data.items.length === 100) {
              offset += page.data.items.length
              page = await reviewsControllerListAssistantReviews(
                { assistantId, limit: 100, offset },
                { signal: controller.signal }
              )
              items.push(...page.data.items)
            }
            return [assistantId, items.some((review) => review.reviewer?.id === currentUserId)] as const
          })
        )
        if (!controller.signal.aborted) {
          setReviewedAssistantIds(new Set(results.filter(([, reviewed]) => reviewed).map(([id]) => id)))
        }
      } catch (error) {
        if (!controller.signal.aborted && !(error instanceof Error && error.name === 'AbortError')) {
          setReviewedAssistantIds(new Set())
          setIsReliable(false)
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()
    return () => controller.abort()
  }, [currentUserId, stableAssistantIds, stableKey])

  const markReviewed = useCallback((assistantId: string) => {
    setReviewedAssistantIds((current) => new Set(current).add(assistantId))
  }, [])

  return { reviewedAssistantIds, isLoading, isReliable, markReviewed }
}
