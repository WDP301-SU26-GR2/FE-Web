import { useEffect, useState } from 'react'

import { fetchMyProfile, type MyProfileData, type ProfileMode } from '../api/profile-api'
import { readProfileError } from '../api/profile-api'

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: MyProfileData | null }
  | { status: 'error'; message: string }

/**
 * Client-side fetch hook for the signed-in user's profile.
 *
 * The loader on the route also fetches this — we expose this hook so the
 * edit form can re-query after submit (so a logged-out user landing here
 * without a loader data path still works, and so we get a small client-side
 * state machine with explicit loading / error states).
 */
export function useMyProfile(mode: ProfileMode): State {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' })
    void (async () => {
      try {
        const data = await fetchMyProfile(mode)
        if (cancelled) return
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({ status: 'ready', data })
      } catch (err) {
        if (cancelled) return
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({ status: 'error', message: readProfileError(err, 'common:errors.unknown') })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode])

  return state
}