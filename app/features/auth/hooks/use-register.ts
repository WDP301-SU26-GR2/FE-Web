import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  authControllerRegister,
  authControllerSendOtp,
  authControllerVerifyEmail
} from '~/api/operations/auth/auth'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

import type {
  RegisterBodyDto,
  SendOtpBodyDto,
  VerifyEmailBodyDto
} from '~/api/model/auth'

type UseRegisterResult = {
  /** Gửi email đăng ký để BE tạo tài khoản (chưa activate). */
  register: (
    payload: RegisterBodyDto
  ) => Promise<boolean>
  /** Gửi mã OTP tới email. Dùng cho cả lần đầu và gửi lại. */
  sendOtp: (payload: SendOtpBodyDto) => Promise<boolean>
  /** Verify mã OTP để activate tài khoản. */
  verifyEmail: (payload: VerifyEmailBodyDto) => Promise<boolean>
  isRegistering: boolean
  isSendingOtp: boolean
  isVerifying: boolean
}

/**
 * Hook điều phối luồng đăng ký 3 bước:
 *   Step 2: register → sendOtp → Step 3
 *   Step 3: verifyEmail (→ xoá pending email → navigate /login)
 *   Step 3: gửi lại OTP (resend) = gọi sendOtp lại với email từ localStorage
 *
 * Mỗi action tự toast lỗi; thành công không toast (Step 2 navigate → Step 3
 * là trách nhiệm của component gọi).
 */
export function useRegister(): UseRegisterResult {
  const { t } = useTranslation('auth')

  const [isRegistering, setIsRegistering] = useState(false)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const register = useCallback(async (payload: RegisterBodyDto) => {
    setIsRegistering(true)
    try {
      await authControllerRegister(payload)
      return true
    } catch (err) {
      toast.error(extractApiErrorMessage(err, t('register.errorGeneric')))
      return false
    } finally {
      setIsRegistering(false)
    }
  }, [t])

  const sendOtp = useCallback(async (payload: SendOtpBodyDto) => {
    setIsSendingOtp(true)
    try {
      await authControllerSendOtp(payload)
      toast.success(t('register.sendOtpSuccess'))
      return true
    } catch (err) {
      toast.error(extractApiErrorMessage(err, t('register.sendOtpError')))
      return false
    } finally {
      setIsSendingOtp(false)
    }
  }, [t])

  const verifyEmail = useCallback(async (payload: VerifyEmailBodyDto) => {
    setIsVerifying(true)
    try {
      await authControllerVerifyEmail(payload)
      toast.success(t('register.verifySuccess'))
      return true
    } catch (err) {
      toast.error(extractApiErrorMessage(err, t('register.verifyError')))
      return false
    } finally {
      setIsVerifying(false)
    }
  }, [t])

  return { register, sendOtp, verifyEmail, isRegistering, isSendingOtp, isVerifying }
}
