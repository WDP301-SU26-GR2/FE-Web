import { useEffect, useState } from 'react'

import { fetchAccountInfo } from '~/features/profile/api/profile-api'
import { useAuth } from '~/features/auth/context/auth-context'

export type SidebarProfile = {
  displayName: string
  name: string
  avatar: string | null
  role: string
  status: string
}

/**
 * Hook to fetch real-time profile data for the sidebar.
 * Falls back to auth session data if the API call fails.
 */
export function useSidebarProfile() {
  const { session } = useAuth()
  const [profile, setProfile] = useState<SidebarProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    void (async () => {
      try {
        const data = await fetchAccountInfo()
        if (cancelled) return
        setProfile({
          displayName: data.displayName ?? data.name,
          name: data.name,
          avatar: data.avatar,
          role: data.role,
          status: data.status
        })
      } catch {
        // Fallback to session data
        if (cancelled) return
        const user = session.user
        setProfile({
          displayName: user.displayName ?? user.name,
          name: user.name,
          avatar: null,
          role: user.role,
          status: ''
        })
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [session])

  return { profile, isLoading }
}
