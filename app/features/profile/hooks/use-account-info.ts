import { useEffect, useState } from 'react'

import { fetchAccountInfo, type AccountInfo } from '../api/profile-api'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: AccountInfo }
  | { status: 'error'; message: string }

/**
 * Client-side fetch hook for the signed-in user's account info.
 *
 * Used by the profile page to display and edit account-level fields
 * (name, displayName, avatar, phoneNumber, email, role, status).
 */
export function useAccountInfo(): State {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' })
    void (async () => {
      try {
        const data = await fetchAccountInfo()
        if (cancelled) return
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({ status: 'ready', data })
      } catch (err) {
        if (cancelled) return
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({
          status: 'error',
          message: extractApiErrorMessage(err, 'common:errors.unknown')
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
