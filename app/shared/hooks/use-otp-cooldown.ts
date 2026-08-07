import { useCallback, useEffect, useState } from 'react'

export const OTP_RESEND_COOLDOWN_SECONDS = 60

export function useOtpCooldown(durationSeconds = OTP_RESEND_COOLDOWN_SECONDS) {
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  useEffect(() => {
    if (remainingSeconds <= 0) return
    const timer = window.setTimeout(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [remainingSeconds])

  const start = useCallback(() => {
    setRemainingSeconds(durationSeconds)
  }, [durationSeconds])

  const reset = useCallback(() => {
    setRemainingSeconds(0)
  }, [])

  return {
    isCoolingDown: remainingSeconds > 0,
    remainingSeconds,
    reset,
    start
  }
}
