import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useRevalidator } from 'react-router'
import { Activity, BookOpen, CheckCircle2, ListChecks, RefreshCw, ShieldAlert, UserRoundCog, Users } from 'lucide-react'

import type { AdminStatsResDtoOutput } from '~/api/model/users'
import { cn } from '~/shared/lib/cn'
import { AdminStatCard } from './components/admin-stat-card'
import { DistributionPanel, type DistributionItem } from './components/distribution-panel'

export interface AdminDashboardProps {
  stats: AdminStatsResDtoOutput | null
  unreadNotifications: number
  hasError: boolean
}

export function AdminDashboard({ stats, unreadNotifications, hasError }: AdminDashboardProps) {
  const { t, i18n } = useTranslation('admin')
  const revalidator = useRevalidator()
  const numberFormatter = useMemo(() => new Intl.NumberFormat(i18n.language), [i18n.language])
  const isRefreshing = revalidator.state !== 'idle'

  const roleItems = toDistributionItems(stats?.users.byRole, (key) =>
    t(`dashboard.roles.${key}`, { defaultValue: humanizeKey(key) })
  )
  const userStatusItems = toDistributionItems(stats?.users.byStatus, (key) =>
    t(`dashboard.userStatuses.${key}`, { defaultValue: humanizeKey(key) })
  )
  const seriesStatusItems = toDistributionItems(stats?.series.byStatus, (key) =>
    t(`dashboard.seriesStatuses.${key}`, { defaultValue: humanizeKey(key) })
  )
  const taskStatusItems = toDistributionItems(stats?.tasks.byStatus, (key) =>
    t(`dashboard.taskStatuses.${key}`, { defaultValue: humanizeKey(key) })
  )

  const format = (value: number | undefined) => (value === undefined ? '—' : numberFormatter.format(value))
  const publishedRate = stats?.chapters.total ? Math.round((stats.chapters.published / stats.chapters.total) * 100) : 0

  return (
    <div className='space-y-6 pb-12'>
      <header className='flex flex-col justify-between gap-4 sm:flex-row sm:items-start'>
        <div>
          <div className='mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
            <ShieldAlert className='size-4' aria-hidden='true' />
            <span>{t('dashboard.eyebrow')}</span>
          </div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground md:text-3xl'>{t('dashboard.title')}</h1>
          <p className='mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground'>{t('dashboard.subtitle')}</p>
        </div>
        <button
          type='button'
          onClick={() => revalidator.revalidate()}
          disabled={isRefreshing}
          className='inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60'
        >
          <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} aria-hidden='true' />
          {isRefreshing ? t('dashboard.refreshing') : t('dashboard.refresh')}
        </button>
      </header>

      {hasError && (
        <div
          className='flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive'
          role='alert'
        >
          <ShieldAlert className='mt-0.5 size-5 shrink-0' aria-hidden='true' />
          <div>
            <p className='text-sm font-bold'>{t('dashboard.loadErrorTitle')}</p>
            <p className='mt-1 text-xs leading-relaxed'>{t('dashboard.loadErrorDescription')}</p>
          </div>
        </div>
      )}

      <section className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4' aria-label={t('dashboard.overview')}>
        <AdminStatCard
          icon={Users}
          label={t('dashboard.kpis.users.label')}
          value={format(stats?.users.total)}
          description={t('dashboard.kpis.users.description', { deleted: format(stats?.users.deleted) })}
          href='/dashboard/admin/users'
        />
        <AdminStatCard
          icon={BookOpen}
          label={t('dashboard.kpis.series.label')}
          value={format(stats?.series.total)}
          description={t('dashboard.kpis.series.description')}
          tone='secondary'
          href='/dashboard/admin/operations/monitoring#series'
        />
        <AdminStatCard
          icon={CheckCircle2}
          label={t('dashboard.kpis.chapters.label')}
          value={format(stats?.chapters.published)}
          description={t('dashboard.kpis.chapters.description', {
            total: format(stats?.chapters.total),
            rate: publishedRate
          })}
          tone='muted'
          href='/dashboard/admin/audit?entityType=CHAPTER'
        />
        <AdminStatCard
          icon={ListChecks}
          label={t('dashboard.kpis.tasks.label')}
          value={format(stats?.tasks.total)}
          description={t('dashboard.kpis.tasks.description')}
          tone='destructive'
          href='/dashboard/admin/audit?entityType=TASK'
        />
      </section>

      {unreadNotifications > 0 && (
        <Link
          to='/dashboard/admin/notifications'
          className='block rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm font-semibold text-foreground hover:border-primary/50'
        >
          {t('dashboard.unreadNotifications', { count: unreadNotifications })}
        </Link>
      )}

      <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
        <DistributionPanel
          title={t('dashboard.sections.roles.title')}
          description={t('dashboard.sections.roles.description')}
          icon={UserRoundCog}
          items={roleItems}
          emptyLabel={t('dashboard.empty')}
        />
        <DistributionPanel
          title={t('dashboard.sections.users.title')}
          description={t('dashboard.sections.users.description')}
          icon={Activity}
          items={userStatusItems}
          emptyLabel={t('dashboard.empty')}
        />
        <DistributionPanel
          title={t('dashboard.sections.series.title')}
          description={t('dashboard.sections.series.description')}
          icon={BookOpen}
          items={seriesStatusItems}
          emptyLabel={t('dashboard.empty')}
        />
        <DistributionPanel
          title={t('dashboard.sections.tasks.title')}
          description={t('dashboard.sections.tasks.description')}
          icon={ListChecks}
          items={taskStatusItems}
          emptyLabel={t('dashboard.empty')}
        />
      </div>
    </div>
  )
}

function toDistributionItems(
  source: Record<string, number> | undefined,
  translateLabel: (key: string) => string
): DistributionItem[] {
  return Object.entries(source ?? {})
    .map(([key, value]) => ({ key, label: translateLabel(key), value }))
    .sort((left, right) => right.value - left.value)
}

function humanizeKey(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
