import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { authControllerLogout } from '~/api/operations/auth/auth'
import { isFetchError } from '~/api/mutator/custom-fetch'
import { useAuth } from '~/features/auth/context/auth-context'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type UseLogoutResult = {
  /** Trigger the logout flow. Resolves once the local session has been
   *  cleared (or kept, when the BE call failed with a non-recoverable
   *  error) and the user has been navigated to /login. */
  logout: () => Promise<void>
  isLoggingOut: boolean
}

/**
 * Logout flow:
 * 1. Fire `POST /auth/logout` with the current refresh token in the body
 *    so the BE can revoke it server-side.
 * 2. On 2xx: clear local session + navigate to /login.
 * 3. On 401: the access token is already expired/dead and the refresh path
 *    in `axios-client` has already cleared storage. Just navigate to /login.
 * 4. On 5xx / network / other 4xx: surface an error toast and DO NOT clear —
 *    the user's session is still usable, this was a transient failure.
 *
 * Only runs when the user explicitly clicks the logout button (no auto-call).
 */
export function useLogout(): UseLogoutResult {
  const { t } = useTranslation('auth')
  const { session, clearSession } = useAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const logout = useCallback(async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      const refreshToken = session?.refreshToken
      if (!refreshToken) {
        // No refresh token in storage → nothing for the BE to revoke.
        // Still clear local state and send the user back to /login.
        clearSession()
        navigate('/login')
        return
      }

      try {
        await authControllerLogout({ refreshToken })
        clearSession()
        navigate('/login')
      } catch (err: unknown) {
        if (isFetchError(err) && err.status === 401) {
          // Access/refresh token already invalid — refresh interceptor in
          // axios-client has wiped storage for us. Just route home.
          clearSession()
          navigate('/login')
          return
        }
        toast.error(extractApiErrorMessage(err, t('logout.errorGeneric')))
      }
    } finally {
      setIsLoggingOut(false)
    }
  }, [clearSession, isLoggingOut, navigate, session?.refreshToken, t])

  return { logout, isLoggingOut }
}