import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { EditorActionResult } from '../types'

export function EditorActionToast({ data, scope }: { data?: EditorActionResult; scope: string }) {
  const { t } = useTranslation('editor')
  const lastData = useRef<EditorActionResult>()

  useEffect(() => {
    if (!data || lastData.current === data) return
    lastData.current = data

    const message = data.ok
      ? data.message || t(`messages.${data.messageKey ?? data.intent}`, { defaultValue: t('messages.operationCompleted') })
      : data.message || t(`errors.${data.errorKey ?? 'actionFailed'}`)
    const id = `${scope}-${data.intent}-${data.ok ? 'success' : 'error'}-${data.messageKey ?? data.errorKey ?? ''}`

    if (data.ok) toast.success(message, { id })
    else toast.error(message, { id })
  }, [data, scope, t])

  return null
}
