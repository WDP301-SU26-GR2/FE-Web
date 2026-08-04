import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { authControllerGoogleLogin, authControllerLogin } from '~/api/operations/auth/auth'
import type { LoginBodyDto, LoginResDtoOutput, LoginResDtoOutputUser } from '~/api/model/auth'
import { useAuth } from '~/features/auth/context/auth-context'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

type LoginSuccess = {
  user: LoginResDtoOutputUser
  accessToken: string
  refreshToken: string
  mustChangePassword: boolean
}

type UseLoginResult = {
  submit: (payload: LoginBodyDto) => Promise<LoginSuccess | null>
  submitGoogle: (idToken: string) => Promise<LoginSuccess | null>
  isSubmitting: boolean
}

/**
 * Runs either supported login flow and persists the returned session.
 * Google returns the same response shape as password login.
 */
export function useLogin(): UseLoginResult {
  const { t } = useTranslation('auth')
  const { setSession } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const completeLogin = useCallback(
    (body: LoginResDtoOutput | undefined): LoginSuccess => {
      const { user, accessToken, refreshToken } = body ?? {}
      const mustChangePassword = body?.mustChangePassword ?? false

      if (!user || !accessToken || !refreshToken) {
        throw new Error('Malformed login response from customFetch')
      }

      setSession({ user, accessToken, refreshToken })
      toast.success(t('login.success'))
      return { user, accessToken, refreshToken, mustChangePassword }
    },
    [setSession, t]
  )

  const runLogin = useCallback(
    async (request: () => Promise<{ data: LoginResDtoOutput }>): Promise<LoginSuccess | null> => {
      setIsSubmitting(true)
      try {
        const response = await request()
        return completeLogin(response.data)
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('login.errorGeneric')))
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [completeLogin, t]
  )

  const submit = useCallback((payload: LoginBodyDto) => runLogin(() => authControllerLogin(payload)), [runLogin])
  const submitGoogle = useCallback(
    (idToken: string) => runLogin(() => authControllerGoogleLogin({ idToken })),
    [runLogin]
  )

  return { submit, submitGoogle, isSubmitting }
}
