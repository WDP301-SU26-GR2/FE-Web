import { AlertTriangle, ArrowLeft, ArrowRight, Clock3, Loader2, RefreshCw, Workflow } from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import type { StudioOverviewResDtoOutputItemsItem } from '~/api/model/studio'
import { Button } from '~/shared/ui/button'
import { cn } from '~/shared/lib/cn'
import { useStudioOverview } from './use-studio-overview'

export function StudioOverviewPage() {
  const { t, i18n } = useTranslation('mangaka')
  const { items, isLoading, error, refresh } = useStudioOverview()
  const language = i18n.resolvedLanguage ?? i18n.language

  return (
    <main className='mx-auto max-w-6xl space-y-6 pb-12'>
      <header className='flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='flex items-center gap-2 text-sm font-semibold text-primary'>
            <Workflow className='size-5' aria-hidden='true' />
            {t('studio.overview.eyebrow')}
          </p>
          <h1 className='mt-2 text-2xl font-bold tracking-tight text-foreground'>{t('studio.overview.title')}</h1>
          <p className='mt-2 max-w-3xl text-sm text-muted-foreground'>{t('studio.overview.description')}</p>
        </div>
        <Button
          variant='outline'
          onClick={refresh}
          disabled={isLoading}
          aria-label={t('studio.overview.actions.refresh')}
        >
          {isLoading ? (
            <Loader2 className='size-4 animate-spin' aria-hidden='true' />
          ) : (
            <RefreshCw className='size-4' aria-hidden='true' />
          )}
          {t('studio.overview.actions.refresh')}
        </Button>
      </header>

      <Link
        to='/dashboard/mangaka/studio'
        className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring'
      >
        <ArrowLeft className='size-4' aria-hidden='true' />
        {t('studio.overview.actions.backToStudio')}
      </Link>

      {isLoading ? <OverviewLoading label={t('studio.overview.loading')} /> : null}

      {!isLoading && error ? (
        <section
          role='alert'
          className='rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-destructive'
        >
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <p className='text-sm'>{error}</p>
            <Button variant='outline' onClick={refresh}>
              {t('studio.overview.actions.retry')}
            </Button>
          </div>
        </section>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <section className='rounded-xl border border-border bg-card px-6 py-16 text-center shadow-sm'>
          <Workflow className='mx-auto size-8 text-muted-foreground' aria-hidden='true' />
          <h2 className='mt-4 font-semibold text-foreground'>{t('studio.overview.empty.title')}</h2>
          <p className='mx-auto mt-2 max-w-md text-sm text-muted-foreground'>
            {t('studio.overview.empty.description')}
          </p>
        </section>
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <section aria-label={t('studio.overview.listLabel')} className='space-y-3'>
          <p className='text-sm text-muted-foreground'>{t('studio.overview.count', { count: items.length })}</p>
          <ul className='grid gap-4 lg:grid-cols-2'>
            {items.map((item) => (
              <li key={item.chapterId}>
                <OverviewCard item={item} language={language} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}

function OverviewLoading({ label }: { label: string }) {
  return (
    <section
      className='flex min-h-56 items-center justify-center rounded-xl border border-border bg-card'
      aria-live='polite'
    >
      <div className='flex items-center gap-3 text-sm text-muted-foreground'>
        <Loader2 className='size-5 animate-spin text-primary' aria-hidden='true' />
        {label}
      </div>
    </section>
  )
}

function OverviewCard({ item, language }: { item: StudioOverviewResDtoOutputItemsItem; language: string }) {
  const { t } = useTranslation('mangaka')
  const progress = Math.max(0, Math.min(100, item.progressPct))
  const warningKey = `studio.overview.warning.${item.warningLevel}`
  const statusKey = `studio.overview.status.${item.manuscriptStatus ?? 'UNKNOWN'}`
  const deadline = formatDeadline(item.deadline, language, t('studio.overview.noDeadline'))
  const remaining = formatRemainingHours(item.remainingHours, t)

  return (
    <article className='h-full rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0'>
          <p className='truncate text-sm font-semibold text-foreground'>{item.seriesTitle}</p>
          <h2 className='mt-1 truncate text-base font-bold text-foreground'>
            {t('studio.overview.chapter', {
              number: item.chapterNumber,
              title: item.title ?? t('studio.overview.untitled')
            })}
          </h2>
        </div>
        <span
          className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', warningClass(item.warningLevel))}
        >
          {t(warningKey, { defaultValue: t('studio.overview.warning.NONE') })}
        </span>
      </div>

      <dl className='mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm'>
        <div>
          <dt className='text-xs text-muted-foreground'>{t('studio.overview.labels.status')}</dt>
          <dd className='mt-1 font-medium text-foreground'>
            {t(statusKey, { defaultValue: t('studio.overview.unknown') })}
          </dd>
        </div>
        <div>
          <dt className='text-xs text-muted-foreground'>{t('studio.overview.labels.deadline')}</dt>
          <dd className='mt-1 font-medium text-foreground'>{deadline}</dd>
        </div>
        <div>
          <dt className='text-xs text-muted-foreground'>{t('studio.overview.labels.timeRemaining')}</dt>
          <dd
            className={cn(
              'mt-1 flex items-center gap-1 font-medium',
              item.remainingHours !== null && item.remainingHours < 0 ? 'text-destructive' : 'text-foreground'
            )}
          >
            <Clock3 className='size-3.5' aria-hidden='true' />
            {remaining}
          </dd>
        </div>
        <div>
          <dt className='text-xs text-muted-foreground'>{t('studio.overview.labels.tasks')}</dt>
          <dd className='mt-1 font-medium text-foreground'>
            {t('studio.overview.taskCount', {
              open: item.openTasks,
              ready: item.pagesReady,
              pending: item.pagesPending
            })}
          </dd>
        </div>
      </dl>

      <div className='mt-5'>
        <div className='flex items-center justify-between gap-4 text-xs'>
          <span className='text-muted-foreground'>{t('studio.overview.labels.progress')}</span>
          <span className='font-semibold text-foreground'>{t('studio.overview.progress', { value: progress })}</span>
        </div>
        <div
          className='mt-2 h-2 overflow-hidden rounded-full bg-muted'
          role='progressbar'
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label={t('studio.overview.labels.progress')}
        >
          <div className='h-full rounded-full bg-primary transition-[width]' style={{ width: `${progress}%` }} />
        </div>
      </div>

      {item.onHold ? (
        <p className='mt-4 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground'>
          <AlertTriangle className='size-4' aria-hidden='true' />
          {t('studio.overview.onHold')}
        </p>
      ) : null}

      <Link
        to={`/publish/${item.seriesId}/${item.chapterId}`}
        className='mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring'
      >
        {t('studio.overview.actions.openChapter')}
        <ArrowRight className='size-4' aria-hidden='true' />
      </Link>
    </article>
  )
}

function warningClass(warning: StudioOverviewResDtoOutputItemsItem['warningLevel']): string {
  if (warning === 'CRITICAL' || warning === 'RED') return 'bg-destructive text-destructive-foreground'
  if (warning === 'YELLOW') return 'bg-secondary text-secondary-foreground'
  return 'bg-muted text-muted-foreground'
}

function formatDeadline(value: string | null, language: string, unavailable: string): string {
  if (!value) return unavailable
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return unavailable
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatRemainingHours(
  hours: number | null,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (hours === null) return t('studio.overview.noDeadline')
  if (hours < 0) return t('studio.overview.overdue', { hours: Math.ceil(Math.abs(hours)) })
  if (hours === 0) return t('studio.overview.dueNow')
  if (hours < 24) return t('studio.overview.remainingHours', { hours: Math.ceil(hours) })
  return t('studio.overview.remainingDays', { days: Math.ceil(hours / 24) })
}
