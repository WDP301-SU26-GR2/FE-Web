import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  authControllerLogin,
  type authControllerLoginResponse
} from '~/api/operations/auth/auth'
import type { LoginResDtoOutputUser } from '~/api/model/auth'
import { useAuth } from '~/features/auth/context/auth-context'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

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
        const { user, accessToken, refreshToken, mustChangePassword } = response.data
        setSession({ user, accessToken, refreshToken })
        toast.success(t('login.success'))
        return { user, accessToken, refreshToken, mustChangePassword }
      } catch (err) {
        toast.error(
          extractApiErrorMessage(err, t('login.errorGeneric'))
        )
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [setSession, t]
  )

  return { submit, isSubmitting }
}