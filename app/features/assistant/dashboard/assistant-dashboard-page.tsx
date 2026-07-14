import { useTranslation } from 'react-i18next'
import { ClipboardList, PlayCircle, Clock, Star, Bell } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { useAssistantDashboardStats } from './use-assistant-dashboard-stats'

type StatCardId = 'pendingTasks' | 'inProgressTasks' | 'upcomingDeadlines' | 'rating'

interface StatCardConfig {
  id: StatCardId
  icon: typeof ClipboardList
  toneClass: string
  bgClass: string
}

const STAT_CARDS: StatCardConfig[] = [
  {
    id: 'pendingTasks',
    icon: ClipboardList,
    toneClass: 'text-primary',
    bgClass: 'bg-primary/10'
  },
  {
    id: 'inProgressTasks',
    icon: PlayCircle,
    toneClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10'
  },
  {
    id: 'upcomingDeadlines',
    icon: Clock,
    toneClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10'
  },
  {
    id: 'rating',
    icon: Star,
    toneClass: 'text-rose-500',
    bgClass: 'bg-rose-500/10'
  }
]

function formatRating(avg: number | null): string {
  if (avg === null || Number.isNaN(avg)) return '—'
  return avg.toFixed(1)
}

/**
 * Assistant dashboard init page.
 *
 * 4 KPI cards wired to `useAssistantDashboardStats`:
 *  1. Pending tasks (ASSIGNED)         ← GET /tasks?status=ASSIGNED&limit=1
 *  2. In progress (IN_PROGRESS)         ← GET /tasks?status=IN_PROGRESS&limit=1
 *  3. Upcoming deadlines (next 7 days)  ← GET /tasks?status=ASSIGNED&limit=100 (client filter)
 *  4. Average rating                    ← GET /me/assistant-profile
 *
 * Each card shows a real number (or "—" when the BE hasn't returned data yet,
 * e.g. 404 on the profile endpoint for fresh assistants who haven't built a
 * profile). The bell badge in the corner shows the total unread notification
 * count (also from `/notifications`).
 */
export function AssistantDashboard() {
  const { t } = useTranslation('assistant')
  const { stats, isLoading } = useAssistantDashboardStats()

  return (
    <div className='space-y-8 pb-16'>
      {/* Dashboard Top Intro */}
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>{t('dashboard.title')}</h1>
          <p className='mt-2 text-sm text-muted-foreground'>{t('dashboard.subtitle')}</p>
        </div>
        <div className='hidden items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:flex'>
          <Bell className='h-4 w-4 text-primary' />
          <span className='tabular-nums'>
            {stats?.unreadNotificationsCount ?? (isLoading ? '…' : '0')} {t('notifications.title').toLowerCase()}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {STAT_CARDS.map(({ id, icon: Icon, toneClass, bgClass }) => {
          const card = t(`dashboard.statCards.${id}`, { returnObjects: true }) as {
            label: string
            description: string
            delta: string
          }
          const value = formatStatValue(id, stats, isLoading, t)
          return (
            <div
              key={id}
              className={cn(
                'group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-5 shadow-md transition-all hover:border-primary/30 hover:shadow-lg'
              )}
            >
              <div className='flex items-start justify-between gap-3'>
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', bgClass)}>
                  <Icon className={cn('h-5 w-5', toneClass)} aria-hidden='true' />
                </div>
                <span className='inline-flex items-center rounded-md border border-border bg-background/50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground'>
                  KPI
                </span>
              </div>

              <div className='mt-6'>
                <p className='text-3xl font-extrabold tracking-tight text-foreground tabular-nums'>{value.number}</p>
                <h3 className='mt-2 text-sm font-bold leading-tight text-foreground'>{card.label}</h3>
                <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>{card.description}</p>
              </div>

              <div className='mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px]'>
                <span className='font-semibold text-muted-foreground'>{value.delta}</span>
                <span className={cn('font-extrabold uppercase tracking-wider', toneClass)}>{value.unit}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer status row (mirrors Mangaka dashboard footer) */}
      <div className='flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row'>
        <div className='flex items-center gap-2 font-semibold'>
          <Star className='h-4 w-4' />
          <span>{t('dashboard.statCards.rating.label')}</span>
        </div>
        <div className='flex items-center gap-1.5 font-medium text-muted-foreground/80'>
          <span>{t('dashboard.engineStatus', { time: '—' })}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Build the value + delta hint shown in each stat card.
 * Returns a structured payload so the JSX stays declarative.
 */
function formatStatValue(
  id: StatCardId,
  stats: ReturnType<typeof useAssistantDashboardStats>['stats'],
  isLoading: boolean,
  t: (key: string, vars?: Record<string, unknown>) => string
): { number: string; unit: string; delta: string } {
  const placeholder = isLoading ? '…' : '—'

  if (id === 'pendingTasks') {
    const count = stats?.pendingTasksCount ?? 0
    return {
      number: isLoading ? placeholder : String(count),
      unit: 'TASKS',
      delta: isLoading ? '—' : t(`dashboard.statCards.pendingTasks.delta`, { count })
    }
  }

  if (id === 'inProgressTasks') {
    const count = stats?.inProgressTasksCount ?? 0
    return {
      number: isLoading ? placeholder : String(count),
      unit: 'ACTIVE',
      delta: isLoading ? '—' : t(`dashboard.statCards.inProgressTasks.delta`, { count })
    }
  }

  if (id === 'upcomingDeadlines') {
    const count = stats?.upcomingDeadlinesCount ?? 0
    return {
      number: isLoading ? placeholder : String(count),
      unit: 'SOON',
      delta: isLoading ? '—' : t(`dashboard.statCards.upcomingDeadlines.delta`, { count })
    }
  }

  // rating
  const avg = stats?.ratingAvg ?? null
  const count = stats?.ratingCount ?? 0
  if (avg !== null) {
    return {
      number: formatRating(avg),
      unit: 'AVG',
      delta: t(`dashboard.statCards.rating.delta`, { avg: formatRating(avg), count })
    }
  }
  return {
    number: placeholder,
    unit: 'AVG',
    delta: '—'
  }
}
