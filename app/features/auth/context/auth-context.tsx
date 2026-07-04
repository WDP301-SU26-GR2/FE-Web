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

function readSessionFromStorage(): AuthSession | null {
  const accessToken = readStorage(STORAGE_KEYS.accessToken)
  const refreshToken = readStorage(STORAGE_KEYS.refreshToken)
  const userJson = readStorage(STORAGE_KEYS.user)
  if (!accessToken || !refreshToken || !userJson) return null

  try {
    const user = JSON.parse(userJson) as LoginResDtoOutputUser
    return { accessToken, refreshToken, user }
  } catch {
    // Corrupted JSON — purge it so we don't loop on a bad state.
    removeStorage(STORAGE_KEYS.user)
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
    writeStorage(STORAGE_KEYS.accessToken, next.accessToken)
    writeStorage(STORAGE_KEYS.refreshToken, next.refreshToken)
    writeStorage(STORAGE_KEYS.user, JSON.stringify(next.user))
    setSessionState(next)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(() => {
    removeStorage(STORAGE_KEYS.accessToken)
    removeStorage(STORAGE_KEYS.refreshToken)
    removeStorage(STORAGE_KEYS.user)
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