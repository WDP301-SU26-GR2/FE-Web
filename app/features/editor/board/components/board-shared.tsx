import { useEffect, useRef } from 'react'
import { Link, useFetcher, useRevalidator } from 'react-router'
import { ArrowLeft, Gavel } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { EditorActionResult } from '../../types'
import { useDialogClose } from '~/shared/ui/dialog'
import { SemanticStatusBadge } from '~/shared/components/status-badge'

export const boardInput =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary'

export function BoardPageLayout({
  titleKey,
  descriptionKey,
  hasError,
  backPath = '/dashboard/editor/board',
  children
}: {
  titleKey: string
  descriptionKey: string
  hasError?: boolean
  backPath?: string
  children: React.ReactNode
}) {
  const { t } = useTranslation('editor')
  return (
    <div className='space-y-7 pb-12'>
      <Link to={backPath} className='inline-flex items-center gap-2 text-xs font-bold text-primary'>
        <ArrowLeft className='size-4' />
        {t('board.back')}
      </Link>
      <header>
        <p className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Gavel className='size-4' />
          {t('board.eyebrow')}
        </p>
        <h1 className='mt-2 text-2xl font-bold text-foreground'>{t(titleKey)}</h1>
        <p className='mt-2 text-xs text-muted-foreground'>{t(descriptionKey)}</p>
      </header>
      {hasError && (
        <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive'>
          {t('errors.loadDescription')}
        </p>
      )}
      {children}
    </div>
  )
}

export function BoardPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <h2 className='mb-4 text-base font-bold text-foreground'>{title}</h2>
      {children}
    </section>
  )
}

export function BoardFeedback({ data }: { data?: EditorActionResult }) {
  const { t } = useTranslation('editor')
  const lastData = useRef<EditorActionResult | undefined>(data)
  const closeDialog = useDialogClose()

  useEffect(() => {
    if (!data || lastData.current === data) return
    lastData.current = data
    const message = data.ok
      ? t(`messages.${data.messageKey}`, { defaultValue: t('messages.operationCompleted') })
      : t(`errors.${data.errorKey ?? 'actionFailed'}`)
    const id = `editor-board-${data.intent}-${data.ok ? 'success' : 'error'}-${data.messageKey ?? data.errorKey ?? ''}`
    if (data.ok) {
      toast.success(message, { id })
      closeDialog?.()
    } else toast.error(message, { id })
  }, [closeDialog, data, t])

  return null
}

export function BoardStatus({ value }: { value: string }) {
  const { t } = useTranslation('editor')
  const label = t(
    [
      `board.sessionStatuses.${value}`,
      `board.sessionPhases.${value}`,
      `board.decisionResultLabels.${value}`,
      `filters.contractStatuses.${value}`,
      `filters.proposalStatuses.${value}`,
      `operations.reprintStatuses.${value}`,
      `operations.transferStatuses.${value}`,
      `common:businessData.values.${value}`
    ],
    { defaultValue: t('common.notAvailable') }
  )
  return <SemanticStatusBadge value={value} label={label} />
}

export function useBoardFetcher() {
  return useFetcher<EditorActionResult>()
}

export function useBoardAutoRefresh() {
  const revalidator = useRevalidator()

  useEffect(() => {
    const revalidateWhenIdle = () => {
      if (revalidator.state === 'idle') revalidator.revalidate()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') revalidateWhenIdle()
    }

    window.addEventListener('focus', revalidateWhenIdle)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', revalidateWhenIdle)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [revalidator])
}
