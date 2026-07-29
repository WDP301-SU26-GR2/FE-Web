import { useCallback, useEffect, useRef, useState } from 'react'

import type { ReviewListResDtoOutputItemsItem } from '~/api/model/reviews'
import type { AssistantProfileResDtoOutput } from '~/api/model/users'
import { reviewsControllerListAssistantReviews } from '~/api/operations/reviews/reviews'
import { usersControllerGetAssistantProfile } from '~/api/operations/users/users'

type AssistantPublicProfileState = {
  profile: AssistantProfileResDtoOutput | null
  reviews: ReviewListResDtoOutputItemsItem[]
  isLoading: boolean
  error: unknown
  retry: () => void
}

/** Loads the exact public profile and review endpoints only while the dialog is open. */
export function useAssistantPublicProfile(userId: string | null): AssistantPublicProfileState {
  const [profile, setProfile] = useState<AssistantProfileResDtoOutput | null>(null)
  const [reviews, setReviews] = useState<ReviewListResDtoOutputItemsItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const retry = useCallback(() => setReloadToken((value) => value + 1), [])

  const load = useCallback(async () => {
    if (!userId) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setActiveUserId(userId)
    setProfile(null)
    setReviews([])
    setIsLoading(true)
    setError(null)

    try {
      const [profileResponse, reviewResponse] = await Promise.all([
        usersControllerGetAssistantProfile({ userId }, { signal: controller.signal }),
        reviewsControllerListAssistantReviews(
          { assistantId: userId, limit: 10, offset: 0 },
          { signal: controller.signal }
        )
      ])
      if (!controller.signal.aborted) {
        setProfile(profileResponse.data)
        setReviews(reviewResponse.data.items)
      }
    } catch (cause: unknown) {
      if (!controller.signal.aborted) {
        setError(cause)
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize the modal with the selected assistant
    void load()
    return () => abortRef.current?.abort()
  }, [load, reloadToken])

  const isCurrentAssistant = activeUserId === userId

  return {
    profile: isCurrentAssistant ? profile : null,
    reviews: isCurrentAssistant ? reviews : [],
    isLoading: Boolean(userId) && (!isCurrentAssistant || isLoading),
    error: isCurrentAssistant ? error : null,
    retry
  }
}
