import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import type { LoginResDtoOutputUser } from '~/api/model/auth'
import { STORAGE_KEYS } from '~/shared/config/site'
import { readStorage, removeStorage, writeStorage } from '~/shared/lib/storage'

export type AuthStatus = 'idle' | 'authenticated' | 'unauthenticated'

type AuthSession = {
  user: LoginResDtoOutputUser
  accessToken: string
  refreshToken: string
}

type AuthContextValue = {
  status: AuthStatus
  /** Hydrated session read from localStorage. Null on first render until
   *  the client-side hydration effect runs. */
  session: AuthSession | null
  isAuthenticated: boolean
  /** Replace the current session (called after a successful login / refresh). */
  setSession: (next: AuthSession) => void
  /** Clear all auth-related localStorage keys. */
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** A localStorage value is considered "junk" if it isn't a non-empty string.
 *  In particular, `setItem(key, undefined)` stores the literal string
 *  `"undefined"` — easy to mistake for a real token on the next read.
 *  We also reject `undefined`/`null` (passed by the caller before it reaches
 *  the storage layer) so we never even write garbage in the first place. */
function isGarbage(value: string | null | undefined): boolean {
  return value == null || value === '' || value === 'undefined' || value === 'null'
}

/** Clear every auth-related localStorage key so a corrupted state can't leak
 *  into the next session. Used in both `logout()` and the catch-all of
 *  `readSessionFromStorage()`. */
function clearAuthStorage(): void {
  removeStorage(STORAGE_KEYS.accessToken)
  removeStorage(STORAGE_KEYS.refreshToken)
  removeStorage(STORAGE_KEYS.user)
}

function readSessionFromStorage(): AuthSession | null {
  const accessToken = readStorage(STORAGE_KEYS.accessToken)
  const refreshToken = readStorage(STORAGE_KEYS.refreshToken)
  const userJson = readStorage(STORAGE_KEYS.user)

  // ── Garbage / partial state → purge everything and start fresh ────────
  // ANY garbage value in any of the three keys invalidates the whole
  // session — refusing to partially restore keeps us out of "user is
  // authenticated with a junk accessToken" loops.
  if (isGarbage(accessToken) || isGarbage(refreshToken) || isGarbage(userJson)) {
    clearAuthStorage()
    return null
  }

  try {
    const user = JSON.parse(userJson as string) as LoginResDtoOutputUser
    // Final guard against missing fields in the parsed object.
    if (!user || typeof user !== 'object' || !user.id) {
      clearAuthStorage()
      return null
    }
    return { accessToken: accessToken as string, refreshToken: refreshToken as string, user }
  } catch {
    // Corrupted JSON — purge it so we don't loop on a bad state.
    clearAuthStorage()
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Render server-side as "unauthenticated, no session" — storage is not
  // available during SSR. The hydration effect below re-checks on the
  // client so a user who was already signed in keeps their session.
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [session, setSessionState] = useState<AuthSession | null>(null)

  // Hydration gate: read persisted session after mount. This pattern is required
  // because localStorage is unavailable during SSR.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const restored = readSessionFromStorage()
    setSessionState(restored)
    setStatus(restored ? 'authenticated' : 'unauthenticated')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const setSession = useCallback((next: AuthSession) => {
    // Validate before persisting — a corrupted session (e.g. caused by a
    // regression in `customFetch`'s envelope unwrap) would otherwise be
    // stored as `localStorage[xxx] = "undefined"`, which then fails to
    // parse on the next read. We surface the issue loudly and bail out
    // BEFORE touching storage; the caller (`useLogin`) handles the visible
    // failure via its own error toast.
    if (
      !next ||
      !next.user ||
      typeof next.user !== 'object' ||
      !next.user.id ||
      isGarbage(next.accessToken) ||
      isGarbage(next.refreshToken)
    ) {
      // eslint-disable-next-line no-console
      console.error(
        '[AuthProvider.setSession] refusing to persist incomplete or garbage session',
        {
          hasUser: !!next?.user,
          hasId: !!next?.user?.id,
          hasAccess: !!next?.accessToken,
          hasRefresh: !!next?.refreshToken,
          accessIsString: typeof next?.accessToken === 'string',
          refreshIsString: typeof next?.refreshToken === 'string'
        }
      )
      throw new Error('AuthProvider.setSession received an incomplete session')
    }

    writeStorage(STORAGE_KEYS.accessToken, next.accessToken)
    writeStorage(STORAGE_KEYS.refreshToken, next.refreshToken)
    writeStorage(STORAGE_KEYS.user, JSON.stringify(next.user))
    setSessionState(next)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(() => {
    clearAuthStorage()
    setSessionState(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      isAuthenticated: status === 'authenticated',
      setSession,
      logout
    }),
    [status, session, setSession, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}