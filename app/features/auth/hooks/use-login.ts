import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { authControllerLogin } from '~/api/operations/auth/auth'
import type { LoginResDtoOutput, LoginResDtoOutputUser } from '~/api/model/auth'
import { useAuth } from '~/features/auth/context/auth-context'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

import type { LoginBodyDto } from '~/api/model/auth'

type LoginSuccess = {
  user: LoginResDtoOutputUser
  accessToken: string
  refreshToken: string
  mustChangePassword: boolean
}

type UseLoginResult = {
  submit: (payload: LoginBodyDto) => Promise<LoginSuccess | null>
  isSubmitting: boolean
}

/**
 * Hook wrapping the BE login endpoint. On success it persists the session
 * via `AuthProvider.setSession` and surfaces a translated success toast.
 * On failure it surfaces an error toast using the message returned by the BE.
 */
export function useLogin(): UseLoginResult {
  const { t } = useTranslation('auth')
  const { setSession } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = useCallback(
    async (payload: LoginBodyDto) => {
      setIsSubmitting(true)
      try {
        const response = await authControllerLogin(payload)
        // API wraps real data in .data due to orval's response envelope.
        // The orval-generated union types declare `void` for the error branch,
        // but `customFetch` only ever resolves on 2xx, so we narrow to the
        // success shape here. Run `npm run orval` if these casts ever feel wrong.
        const body = response.data as LoginResDtoOutput | undefined
        const { user, accessToken, refreshToken } = body ?? {}
        const mustChangePassword = body?.mustChangePassword ?? false

        // Defensive: if `customFetch` ever regresses (e.g. stops unwrapping
        // the BE envelope), destructure will produce `undefined`s. We catch
        // it here with a loud error and surface as a generic login failure,
        // rather than silently writing `undefined` strings to localStorage.
        if (!user || !accessToken || !refreshToken) {
          // eslint-disable-next-line no-console
          console.error(
            '[useLogin] login response missing required fields. Likely cause: customFetch did not unwrap the BE envelope { success, data }.',
            { response, body }
          )
          throw new Error('Malformed login response from customFetch')
        }

        setSession({ user, accessToken, refreshToken })
        toast.success(t('login.success'))
        return { user, accessToken, refreshToken, mustChangePassword }
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('login.errorGeneric')))
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [setSession, t]
  )

  return { submit, isSubmitting }
}
