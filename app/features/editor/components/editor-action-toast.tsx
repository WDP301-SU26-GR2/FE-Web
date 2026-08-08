import { useEffect, useRef } from 'react'
import { useRevalidator } from 'react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { EditorActionResult } from '../types'
import { useDialogClose } from '~/shared/ui/dialog'

export function EditorActionToast({
  data,
  scope,
  closeOnSuccess = false
}: {
  data?: EditorActionResult
  scope: string
  closeOnSuccess?: boolean
}) {
  const { t } = useTranslation('editor')
  const lastData = useRef<EditorActionResult | undefined>(undefined)
  const closeDialog = useDialogClose()
  const revalidator = useRevalidator()

  useEffect(() => {
    if (!data || lastData.current === data) return
    lastData.current = data

    const message = data.ok
      ? t(`messages.${data.messageKey ?? data.intent}`, { defaultValue: t('messages.operationCompleted') })
      : t(`errors.${data.errorKey ?? 'actionFailed'}`)
    const id = `${scope}-${data.intent}-${data.ok ? 'success' : 'error'}-${data.messageKey ?? data.errorKey ?? ''}`

    if (data.ok) {
      toast.success(message, { id })
      if (closeOnSuccess) closeDialog?.()
      // Refresh route loader data exactly once after a successful action —
      // replaces the old focus/visibility polling pattern.
      if (revalidator.state === 'idle') revalidator.revalidate()
    } else toast.error(message, { id })
  }, [closeDialog, closeOnSuccess, data, revalidator, scope, t])

  return null
}
