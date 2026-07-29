import { useCallback, useEffect, useRef, useState } from 'react'

import type { ReviewListResDtoOutputItemsItem } from '~/api/model/reviews'
import type { MangakaProfileResDtoOutput } from '~/api/model/users'
import { reviewsControllerListMangakaReviews } from '~/api/operations/reviews/reviews'
import { usersControllerGetMangakaProfile } from '~/api/operations/users/users'

export type UseMangakaPublicProfileResult = {
  profile: MangakaProfileResDtoOutput | null
  reviews: ReviewListResDtoOutputItemsItem[]
  isLoading: boolean
  error: unknown
  reviewsError: unknown
  retry: () => void
}

export function useMangakaPublicProfile(userId: string | null): UseMangakaPublicProfileResult {
  const [profile, setProfile] = useState<MangakaProfileResDtoOutput | null>(null)
  const [reviews, setReviews] = useState<ReviewListResDtoOutputItemsItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [reviewsError, setReviewsError] = useState<unknown>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const retry = useCallback(() => setReloadToken((value) => value + 1), [])

  const loadProfile = useCallback(async (targetUserId: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setProfile(null)
    setReviews([])
    setIsLoading(true)
    setError(null)
    setReviewsError(null)

    const [profileResult, reviewsResult] = await Promise.allSettled([
      usersControllerGetMangakaProfile({ userId: targetUserId }, { signal: controller.signal }),
      reviewsControllerListMangakaReviews(
        { mangakaId: targetUserId, limit: 10, offset: 0 },
        { signal: controller.signal }
      )
    ])
    if (controller.signal.aborted) return

    if (profileResult.status === 'fulfilled') setProfile(profileResult.value.data)
    else setError(profileResult.reason)

    if (reviewsResult.status === 'fulfilled') setReviews(reviewsResult.value.data.items)
    else setReviewsError(reviewsResult.reason)

    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadProfile(userId)
    }
    return () => abortRef.current?.abort()
  }, [loadProfile, reloadToken, userId])

  return { profile, reviews, isLoading, error, reviewsError, retry }
}
