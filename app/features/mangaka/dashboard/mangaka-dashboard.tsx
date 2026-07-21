import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  FileText,
  Sparkles,
  MoreVertical,
  HelpCircle,
  Upload,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { useMangakaDashboard } from './use-mangaka-dashboard'
import { cn } from '~/shared/lib/cn'

/** Map manuscriptStatus → human-readable subtitle for studio card */
function getManuscriptSubtitle(status: string | null | undefined, t: (key: string) => string): string {
  if (!status) return ''
  switch (status) {
    case 'DRAFT':
      return t('dashboard.studio.subtitleDraft')
    case 'IN_PRODUCTION':
      return t('dashboard.studio.subtitleInProduction')
    case 'EDITOR_REVIEW':
      return t('dashboard.studio.subtitleEditorReview')
    case 'EDITOR_REVISION':
      return t('dashboard.studio.subtitleEditorRevision')
    case 'READY_FOR_PRINT':
      return t('dashboard.studio.subtitleReadyForPrint')
    case 'AWAITING_CO_OWNER_APPROVAL':
      return t('dashboard.studio.subtitleAwaitingCoOwner')
    case 'PUBLISHED':
      return t('dashboard.studio.subtitlePublished')
    default:
      return status
  }
}

/** Map warningLevel → color class */
function getWarningColor(warningLevel: string): { text: string } {
  switch (warningLevel) {
    case 'CRITICAL':
    case 'RED':
      return { text: 'text-rose-500' }
    case 'YELLOW':
      return { text: 'text-amber-500' }
    default:
      return { text: 'text-muted-foreground' }
  }
}

/** Map seriesStatus → badge color */
function getSeriesStatusColor(status: string | null | undefined): string {
  if (!status) return 'text-muted-foreground bg-muted/10 border-muted/20'
  switch (status) {
    case 'SERIALIZED':
      return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    case 'HIATUS':
      return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
    case 'COMPLETING':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    case 'CANCELLING':
      return 'text-rose-500 bg-rose-500/10 border-rose-500/20'
    default:
      return 'text-muted-foreground bg-muted/10 border-muted/20'
  }
}

/** Map rankChange → display text + color */
function getRankChangeDisplay(change: number | null): {
  text: string
  color: string
} {
  if (change === null || change === 0) {
    return { text: 'Steady', color: 'text-muted-foreground' }
  }
  if (change > 0) {
    return { text: `+${change} pos`, color: 'text-emerald-500' }
  }
  return { text: `${change} pos`, color: 'text-rose-500' }
}

export function MangakaDashboard() {
  const { t } = useTranslation('mangaka')
  const { data, loading, error, reload } = useMangakaDashboard()

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center gap-4 py-20'>
        <AlertCircle className='h-10 w-10 text-rose-500' />
        <p className='text-destructive text-center'>{error}</p>
        <button
          onClick={reload}
          className='rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer'
        >
          {t('common.retry', 'Thử lại')}
        </button>
      </div>
    )
  }

  // Derived: count critical deadlines (warningLevel RED or CRITICAL)
  const criticalDeadlines = data?.studio.filter(
    (item) => item.warningLevel === 'RED' || item.warningLevel === 'CRITICAL'
  ) ?? []

  const actionCount =
    (data?.unreadNotifications ?? 0) + (data?.openRevisionRequests ?? 0)

  // Get series initials from title (first 2 chars, or split by space)
  function getInitials(title: string): string {
    const words = title.trim().split(/\s+/)
    if (words.length === 1) {
      return title.slice(0, 2).toUpperCase()
    }
    return words
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
  }

  // Generate gradient from series title (deterministic)
  const gradients = [
    'from-blue-600 to-indigo-700',
    'from-purple-600 to-pink-700',
    'from-neutral-700 to-slate-900',
    'from-emerald-600 to-teal-700',
    'from-amber-600 to-orange-700',
    'from-rose-600 to-red-700'
  ]

  function getGradient(title: string): string {
    const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return gradients[hash % gradients.length]
  }

  return (
    <div className='space-y-8 pb-16'>
      {/* Dashboard Top Intro */}
      <div>
        <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
          {t('dashboard.title')}
        </h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          {actionCount > 0
            ? t('dashboard.subtitle', { count: actionCount })
            : t('dashboard.subtitleIdle')}
        </p>
      </div>

      {/* Main Grid */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left Side: Deadlines and Active Series */}
        <div className='space-y-6 lg:col-span-2'>
          {/* CRITICAL DEADLINES PANEL */}
          <div className='rounded-xl border border-border bg-card p-6 shadow-md'>
            <div className='flex items-center justify-between'>
              <h2 className='flex items-center gap-2 text-base font-bold tracking-wide'>
                <AlertTriangle className='h-5 w-5 text-rose-500' />
                <span>{t('dashboard.criticalDeadlines')}</span>
              </h2>
              {criticalDeadlines.length > 0 && (
                <span className='inline-flex items-center rounded-md bg-rose-500/10 border border-rose-500/25 px-2.5 py-0.5 text-xs font-extrabold tracking-wider text-rose-500'>
                  {t('dashboard.actionRequired')}
                </span>
              )}
            </div>

            {criticalDeadlines.length === 0 ? (
              <p className='mt-4 text-sm text-muted-foreground'>
                {t('dashboard.noCriticalDeadlines')}
              </p>
            ) : (
              <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {criticalDeadlines.slice(0, 4).map((item) => {
                  const warning = getWarningColor(item.warningLevel)
                  const chapterTitle: string = item.title ?? ''
                  const subtitle = chapterTitle
                    ? chapterTitle
                    : getManuscriptSubtitle(item.manuscriptStatus, t)
                  return (
                    <div
                      key={item.chapterId}
                      className='flex flex-col justify-between rounded-lg border border-border bg-background/50 p-4 transition-all hover:border-primary/30'
                    >
                      <div>
                        <h3 className='text-sm font-bold'>{item.seriesTitle}</h3>
                        <p className='mt-1 text-xs text-muted-foreground font-semibold'>
                          {t('dashboard.studio.chapterLabel', {
                            number: item.chapterNumber,
                            title: subtitle
                          })}
                        </p>
                      </div>
                      <div className='mt-6 flex items-center justify-between'>
                        <div className={cn('text-xs font-bold', warning.text)}>
                          <span>
                            {item.remainingHours !== null && item.remainingHours <= 24
                              ? t('dashboard.dueInHours', { hours: item.remainingHours })
                              : item.remainingHours !== null
                                ? t('dashboard.dueInDays', { days: Math.ceil(item.remainingHours / 24) })
                                : t('dashboard.noDeadline')}
                          </span>
                        </div>
                        <a
                          href={`/dashboard/mangaka/series/${item.seriesId}`}
                          className='flex items-center gap-1 rounded bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all'
                        >
                          <span>{t('dashboard.openStudio')}</span>
                          <ArrowUpRight className='h-3 w-3' />
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ACTIVE SERIES LIST */}
          <div className='rounded-xl border border-border bg-card p-6 shadow-md'>
            <div className='flex items-center justify-between'>
              <h2 className='text-base font-bold tracking-wide'>
                {t('dashboard.activeSeries')}
              </h2>
              <a
                href='/dashboard/mangaka/series'
                className='rounded-lg p-1.5 hover:bg-muted text-muted-foreground transition-all cursor-pointer'
                aria-label={t('dashboard.viewAllSeries')}
              >
                <MoreVertical className='h-5 w-5' />
              </a>
            </div>

            {/* Studio items — derived from dashboard data */}
            {data?.studio && data.studio.length > 0 ? (
              <div className='mt-4 divide-y divide-border'>
                {data.studio.slice(0, 5).map((item) => {
                  const chapterTitle: string = item.title ?? ''
                  const subtitle = chapterTitle
                    ? chapterTitle
                    : getManuscriptSubtitle(item.manuscriptStatus, t)
                  return (
                    <div key={item.chapterId} className='flex items-center justify-between py-4 first:pt-0 last:pb-0'>
                      <div className='flex items-center gap-4'>
                        {/* Stylized Cover Art Placeholder */}
                        <div
                          className={cn(
                            'flex h-12 w-9 shrink-0 items-center justify-center rounded bg-gradient-to-br font-extrabold text-[11px] text-white shadow',
                            getGradient(item.seriesTitle)
                          )}
                        >
                          {getInitials(item.seriesTitle)}
                        </div>
                        <div>
                          <h3 className='text-sm font-bold leading-tight'>{item.seriesTitle}</h3>
                          <p className='mt-0.5 text-xs text-muted-foreground'>
                            {t('dashboard.studio.chapterLabel', {
                              number: item.chapterNumber,
                              title: subtitle
                            })}
                          </p>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                          getSeriesStatusColor(item.manuscriptStatus)
                        )}
                      >
                        {item.manuscriptStatus}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className='mt-4 text-sm text-muted-foreground'>
                {t('dashboard.noActiveSeries')}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Weekly Rankings and Action Inbox */}
        <div className='space-y-6'>
          {/* WEEKLY RANKINGS */}
          <div className='rounded-xl border border-border bg-card p-6 shadow-md flex flex-col justify-between'>
            <div>
              <div className='flex items-center justify-between'>
                <h2 className='flex items-center gap-2 text-base font-bold tracking-wide'>
                  <TrendingUp className='h-5 w-5 text-primary' />
                  <span>{t('dashboard.weeklyRankings')}</span>
                </h2>
              </div>

              {data?.rankings && data.rankings.length > 0 ? (
                <div className='mt-4 space-y-3'>
                  {data.rankings.slice(0, 5).map((item) => {
                    const rankDisplay = getRankChangeDisplay(item.rankChange)
                    return (
                      <div
                        key={item.seriesId}
                        className='flex items-center justify-between rounded-lg border border-border bg-background/30 p-3 text-sm'
                      >
                        <div className='flex items-center gap-3'>
                          <span className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary'>
                            {item.rankPosition ?? '-'}
                          </span>
                          <span className='font-semibold truncate max-w-[130px]' title={item.seriesTitle}>
                            {item.seriesTitle}
                          </span>
                        </div>
                        <span className={cn('text-xs font-bold', rankDisplay.color)}>
                          {rankDisplay.text}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className='mt-4 text-sm text-muted-foreground'>
                  {t('dashboard.noRankings')}
                </p>
              )}
            </div>

            <a
              href='/dashboard/mangaka/rankings'
              className='mt-6 flex w-full items-center justify-center gap-1 text-center text-xs font-bold text-primary hover:underline'
            >
              <span>{t('dashboard.viewAnalyticsReport')}</span>
              <ChevronRight className='h-3.5 w-3.5' />
            </a>
          </div>

          {/* ACTION INBOX */}
          <div className='rounded-xl border border-border bg-card p-6 shadow-md'>
            <div className='flex items-center justify-between'>
              <h2 className='text-base font-bold tracking-wide'>
                {t('dashboard.actionInbox')}
              </h2>
              {actionCount > 0 && (
                <span className='flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow shadow-primary/20'>
                  {actionCount}
                </span>
              )}
            </div>

            <div className='mt-4 space-y-3'>
              {/* Unread notifications */}
              {data && data.unreadNotifications > 0 && (
                <a
                  href='/dashboard/mangaka/notifications'
                  className='flex items-start gap-3 rounded-lg border border-border p-4 transition-all hover:scale-[1.01] cursor-pointer'
                >
                  <FileText className='h-5 w-5 shrink-0 mt-0.5 text-amber-500' />
                  <div className='min-w-0'>
                    <h4 className='text-xs font-bold truncate text-foreground'>
                      {t('dashboard.inbox.notifications', { count: data.unreadNotifications })}
                    </h4>
                    <p className='mt-1 text-[11px] text-muted-foreground leading-normal'>
                      {t('dashboard.inbox.notificationsDesc')}
                    </p>
                  </div>
                </a>
              )}

              {/* Open revision requests */}
              {data && data.openRevisionRequests > 0 && (
                <a
                  href='/dashboard/mangaka/series'
                  className='flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 transition-all hover:scale-[1.01] cursor-pointer'
                >
                  <AlertCircle className='h-5 w-5 shrink-0 mt-0.5 text-rose-500' />
                  <div className='min-w-0'>
                    <h4 className='text-xs font-bold truncate text-foreground'>
                      {t('dashboard.inbox.revisions', { count: data.openRevisionRequests })}
                    </h4>
                    <p className='mt-1 text-[11px] text-muted-foreground leading-normal'>
                      {t('dashboard.inbox.revisionsDesc')}
                    </p>
                  </div>
                </a>
              )}

              {/* Placeholder items when nothing */}
              {actionCount === 0 && (
                <div className='flex items-start gap-3 rounded-lg border border-border p-4 transition-all'>
                  <Sparkles className='h-5 w-5 shrink-0 mt-0.5 text-primary' />
                  <div className='min-w-0'>
                    <h4 className='text-xs font-bold truncate text-foreground'>
                      {t('dashboard.inbox.allClear')}
                    </h4>
                    <p className='mt-1 text-[11px] text-muted-foreground leading-normal'>
                      {t('dashboard.inbox.allClearDesc')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Footer (Bottom Actions & engine status info) */}
      <div className='flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row'>
        <div className='flex items-center gap-6'>
          <a
            href='/dashboard/mangaka/series/propose'
            className='flex items-center gap-2 hover:text-foreground font-semibold transition-colors cursor-pointer'
          >
            <Upload className='h-4 w-4' />
            <span>{t('dashboard.uploadBatch')}</span>
          </a>
          <button className='flex items-center gap-2 hover:text-foreground font-semibold transition-colors cursor-pointer'>
            <HelpCircle className='h-4 w-4' />
            <span>{t('dashboard.editorSupport')}</span>
          </button>
        </div>
        <div className='flex items-center gap-1.5 text-muted-foreground/80 font-medium'>
          <RefreshCw
            className='h-3.5 w-3.5 text-primary shrink-0 cursor-pointer hover:text-foreground transition-colors'
            onClick={reload}
            role='button'
            aria-label={t('dashboard.refresh')}
          />
          <span>{t('dashboard.engineStatus', { time: '2m' })}</span>
        </div>
      </div>
    </div>
  )
}
