import { useEffect } from 'react'
import { Link, useFetcher, useRevalidator } from 'react-router'
import { ArrowLeft, Gavel } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { EditorActionResult } from '../../types'

export const boardInput =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary'

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
      <Link to={backPath} className='inline-flex items-center gap-2 text-sm font-bold text-primary'>
        <ArrowLeft className='size-4' />
        {t('board.back')}
      </Link>
      <header>
        <p className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Gavel className='size-4' />
          {t('board.eyebrow')}
        </p>
        <h1 className='mt-2 text-3xl font-bold text-foreground'>{t(titleKey)}</h1>
        <p className='mt-2 text-sm text-muted-foreground'>{t(descriptionKey)}</p>
      </header>
      {hasError && (
        <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
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
      <h2 className='mb-4 text-lg font-bold text-foreground'>{title}</h2>
      {children}
    </section>
  )
}

export function BoardFeedback({ data }: { data?: EditorActionResult }) {
  const { t } = useTranslation('editor')
  if (!data) return null
  return (
    <p className={`mt-3 text-xs font-semibold ${data.ok ? 'text-primary' : 'text-destructive'}`}>
      {data.ok ? t(`messages.${data.messageKey}`) : t(`errors.${data.errorKey ?? 'actionFailed'}`)}
    </p>
  )
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
      `operations.transferStatuses.${value}`
    ],
    { defaultValue: value.replaceAll('_', ' ') }
  )
  return (
    <span className='rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold text-secondary-foreground'>
      {label}
    </span>
  )
}

export function useBoardFetcher() {
  return useFetcher<EditorActionResult>()
}

export function useBoardAutoRefresh() {
  const revalidator = useRevalidator()

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (revalidator.state === 'idle') revalidator.revalidate()
    }, 15_000)

    return () => window.clearInterval(timer)
  }, [revalidator])
}
