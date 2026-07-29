import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, Gavel, Loader2, PencilLine } from 'lucide-react'
import { Link, useFetcher, useRevalidator } from 'react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { BoardActionResult } from '../types'
import { Dialog, useDialogClose } from '~/shared/ui/dialog'
import { SemanticStatusBadge } from '~/shared/components/status-badge'

export const boardInput =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary'

export function BoardHeader({
  title,
  description,
  backHref
}: {
  title: string
  description: string
  backHref?: string
}) {
  const { t } = useTranslation('board')
  return (
    <header>
      {backHref && (
        <Link
          to={backHref}
          className='mb-4 inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline'
        >
          <ArrowLeft className='size-4' aria-hidden='true' />
          {t('common.back')}
        </Link>
      )}
      <p className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
        <Gavel className='size-4' />
        {t('common.eyebrow')}
      </p>
      <h1 className='mt-2 text-2xl font-bold text-foreground'>{title}</h1>
      <p className='mt-2 text-xs text-muted-foreground'>{description}</p>
    </header>
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

export function BoardActionDialog({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const titleId = `board-action-${useId().replaceAll(':', '')}`

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground'
      >
        <PencilLine className='size-4' />
        {title}
      </button>
      {open && (
        <Dialog compact open onClose={() => setOpen(false)} titleId={titleId} title={title} size='sm'>
          {children}
        </Dialog>
      )}
    </>
  )
}

export function StatusBadge({ value }: { value: string }) {
  const { t } = useTranslation('board')
  const label = t(
    [
      `filters.sessionStatuses.${value}`,
      `filters.sessionPhases.${value}`,
      `filters.decisionResults.${value}`,
      `filters.contractStatuses.${value}`,
      `filters.paymentStatuses.${value}`,
      `filters.reprintStatuses.${value}`,
      `filters.transferStatuses.${value}`,
      `sessions.seriesBrief.seriesStatuses.${value}`,
      `deadlines.statuses.${value}`,
      `rankings.riskLevels.${value}`,
      `audit.entityTypes.${value}`,
      `audit.actions.${value}`
    ],
    { defaultValue: value.replaceAll('_', ' ') }
  )
  return <SemanticStatusBadge value={value} label={label} />
}

export function Feedback({ data }: { data?: BoardActionResult }) {
  const { t } = useTranslation('board')
  const lastData = useRef<BoardActionResult | undefined>(data)
  const closeDialog = useDialogClose()

  useEffect(() => {
    if (!data || lastData.current === data) return
    lastData.current = data
    const message = data.ok
      ? data.message || t(`messages.${data.messageKey ?? data.intent}`, { defaultValue: t('common.success') })
      : data.message || t('common.failure')
    const id = `board-${data.intent}-${data.ok ? 'success' : 'error'}-${data.messageKey ?? data.requestId ?? ''}`
    if (data.ok) {
      toast.success(message, { id })
      closeDialog?.()
    } else toast.error(message, { id })
  }, [closeDialog, data, t])

  return null
}

export const BoardFeedback = Feedback

export function ActionButton({ label, intent, disabled }: { label: string; intent?: string; disabled?: boolean }) {
  const fetcher = useFetcher<BoardActionResult>()
  return (
    <button
      name={intent ? 'intent' : undefined}
      value={intent}
      disabled={disabled || fetcher.state !== 'idle'}
      className='inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50'
    >
      {fetcher.state !== 'idle' && <Loader2 className='size-4 animate-spin' />}
      {label}
    </button>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <p className='rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground'>
      {text}
    </p>
  )
}

export function useBoardPolling(interval = 10_000) {
  const revalidator = useRevalidator()
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (revalidator.state === 'idle') revalidator.revalidate()
    }, interval)
    return () => window.clearInterval(timer)
  }, [interval, revalidator])
}
