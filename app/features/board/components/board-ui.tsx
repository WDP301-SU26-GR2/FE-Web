import { useEffect, useId, useState } from 'react'
import { Gavel, Loader2, PencilLine } from 'lucide-react'
import { useFetcher, useRevalidator } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { BoardActionResult } from '../types'
import { Dialog } from '~/shared/ui/dialog'

export const boardInput =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary'

export function BoardHeader({ title, description }: { title: string; description: string }) {
  const { t } = useTranslation('board')
  return (
    <header>
      <p className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
        <Gavel className='size-4' />
        {t('common.eyebrow')}
      </p>
      <h1 className='mt-2 text-3xl font-bold text-foreground'>{title}</h1>
      <p className='mt-2 text-sm text-muted-foreground'>{description}</p>
    </header>
  )
}

export function BoardPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <h2 className='mb-4 text-lg font-bold text-foreground'>{title}</h2>
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
        className='inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
      >
        <PencilLine className='size-4' />
        {title}
      </button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} titleId={titleId} title={title} size='sm'>
          {children}
        </Dialog>
      )}
    </>
  )
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className='rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold text-secondary-foreground'>
      {value.replaceAll('_', ' ')}
    </span>
  )
}

export function Feedback({ data }: { data?: BoardActionResult }) {
  const { t } = useTranslation('board')
  if (!data) return null
  return (
    <p className={`mt-3 text-xs font-semibold ${data.ok ? 'text-primary' : 'text-destructive'}`}>
      {data.ok ? t('common.success') : data.message || t('common.failure')}
    </p>
  )
}

export const BoardFeedback = Feedback

export function ActionButton({ label, intent, disabled }: { label: string; intent?: string; disabled?: boolean }) {
  const fetcher = useFetcher<BoardActionResult>()
  return (
    <button
      name={intent ? 'intent' : undefined}
      value={intent}
      disabled={disabled || fetcher.state !== 'idle'}
      className='inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50'
    >
      {fetcher.state !== 'idle' && <Loader2 className='size-4 animate-spin' />}
      {label}
    </button>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <p className='rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground'>
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
