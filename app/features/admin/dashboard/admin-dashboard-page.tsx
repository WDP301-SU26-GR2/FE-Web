import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useRevalidator } from 'react-router'
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpen,
  CheckCircle2,
  Gavel,
  ListChecks,
  RefreshCw,
  ScrollText,
  Settings2,
  ShieldAlert,
  UserRoundCog,
  Users,
  Wrench,
  type LucideIcon
} from 'lucide-react'

import type { AdminStatsResDtoOutput } from '~/api/model/users'
import { cn } from '~/shared/lib/cn'
import { AdminStatCard } from './components/admin-stat-card'
import { DistributionDonut } from './components/distribution-donut'
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
  const accessAttention =
    (stats?.users.byStatus.INACTIVE ?? 0) + (stats?.users.byStatus.BLOCKED ?? 0) + (stats?.users.byStatus.BANNED ?? 0)
  const activeSeries =
    (stats?.series.byStatus.SERIALIZED ?? 0) +
    (stats?.series.byStatus.HIATUS ?? 0) +
    (stats?.series.byStatus.COMPLETING ?? 0) +
    (stats?.series.byStatus.CANCELLING ?? 0)
  const reviewTasks =
    (stats?.tasks.byStatus.SUBMITTED ?? 0) +
    (stats?.tasks.byStatus.UNDER_REVIEW ?? 0) +
    (stats?.tasks.byStatus.REVISION_REQUESTED ?? 0)

  return (
    <div className='space-y-7 pb-12'>
      <section className='relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-6 shadow-sm md:p-8'>
        <div className='absolute -right-16 -top-24 size-64 rounded-full bg-primary/10 blur-3xl' />
        <div className='absolute -bottom-24 left-1/3 size-56 rounded-full bg-secondary/60 blur-3xl' />
        <div className='relative flex flex-col justify-between gap-6 xl:flex-row xl:items-start'>
          <header>
            <div className='mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
              <ShieldAlert className='size-4' aria-hidden='true' />
              <span>{t('dashboard.eyebrow')}</span>
            </div>
            <h1 className='max-w-3xl text-2xl font-black tracking-tight text-foreground md:text-3xl'>
              {t('dashboard.title')}
            </h1>
            <p className='mt-3 max-w-2xl text-sm leading-6 text-muted-foreground'>{t('dashboard.subtitle')}</p>
            <div className='mt-5 flex flex-wrap gap-2'>
              <QuickLink href='/dashboard/admin/users' icon={Users} label={t('dashboard.quickActions.users')} />
              <QuickLink href='/dashboard/admin/board' icon={Gavel} label={t('dashboard.quickActions.board')} />
              <QuickLink
                href='/dashboard/admin/operations'
                icon={Wrench}
                label={t('dashboard.quickActions.operations')}
              />
              <QuickLink href='/dashboard/admin/audit' icon={ScrollText} label={t('dashboard.quickActions.audit')} />
            </div>
          </header>

          <div className='flex shrink-0 flex-col items-stretch gap-3 sm:flex-row xl:flex-col'>
            <button
              type='button'
              onClick={() => revalidator.revalidate()}
              disabled={isRefreshing}
              className='inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2.5 text-xs font-bold text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60'
            >
              <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} aria-hidden='true' />
              {isRefreshing ? t('dashboard.refreshing') : t('dashboard.refresh')}
            </button>
            <Link
              to='/dashboard/admin/settings'
              className='inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background'
            >
              <Settings2 className='size-4' />
              {t('dashboard.quickActions.settings')}
            </Link>
          </div>
        </div>
      </section>

      {hasError && (
        <div
          className='flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive'
          role='alert'
        >
          <ShieldAlert className='mt-0.5 size-5 shrink-0' aria-hidden='true' />
          <div>
            <p className='text-xs font-bold'>{t('dashboard.loadErrorTitle')}</p>
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
          className='group flex items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-primary/10 p-4 text-xs font-semibold text-foreground hover:border-primary/50'
        >
          <span className='flex items-center gap-3'>
            <span className='flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
              <BellRing className='size-4' />
            </span>
            {t('dashboard.unreadNotifications', { count: unreadNotifications })}
          </span>
          <ArrowRight className='size-4 text-primary transition-transform group-hover:translate-x-1' />
        </Link>
      )}

      <section>
        <div className='mb-4'>
          <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
            <Activity className='size-4' />
            {t('dashboard.pulse.eyebrow')}
          </div>
          <h2 className='mt-2 text-lg font-bold text-foreground'>{t('dashboard.pulse.title')}</h2>
          <p className='mt-1 text-xs text-muted-foreground'>{t('dashboard.pulse.description')}</p>
        </div>
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <SnapshotInsight
            icon={ShieldAlert}
            value={format(accessAttention)}
            label={t('dashboard.pulse.accessAttention')}
            description={t('dashboard.pulse.accessAttentionDescription')}
            href='/dashboard/admin/users'
          />
          <SnapshotInsight
            icon={BookOpen}
            value={format(activeSeries)}
            label={t('dashboard.pulse.activeSeries')}
            description={t('dashboard.pulse.activeSeriesDescription')}
            href='/dashboard/admin/operations/monitoring'
          />
          <SnapshotInsight
            icon={ListChecks}
            value={format(reviewTasks)}
            label={t('dashboard.pulse.reviewTasks')}
            description={t('dashboard.pulse.reviewTasksDescription')}
            href='/dashboard/admin/audit?entityType=TASK'
          />
          <SnapshotInsight
            icon={BarChart3}
            value={`${publishedRate}%`}
            label={t('dashboard.pulse.publicationRate')}
            description={t('dashboard.pulse.publicationRateDescription')}
            href='/dashboard/admin/audit?entityType=CHAPTER'
          />
        </div>
      </section>

      <div className='grid gap-4 xl:grid-cols-2'>
        <DistributionDonut
          title={t('dashboard.sections.roles.title')}
          description={t('dashboard.sections.roles.description')}
          centerLabel={t('dashboard.sections.roles.centerLabel')}
          icon={UserRoundCog}
          items={roleItems}
          emptyLabel={t('dashboard.empty')}
        />
        <DistributionDonut
          title={t('dashboard.sections.users.title')}
          description={t('dashboard.sections.users.description')}
          centerLabel={t('dashboard.sections.users.centerLabel')}
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

function QuickLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      to={href}
      className='group inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-2 text-xs font-bold text-foreground transition hover:border-primary/40 hover:text-primary'
    >
      <Icon className='size-3.5' />
      {label}
      <ArrowRight className='size-3 transition-transform group-hover:translate-x-0.5' />
    </Link>
  )
}

function SnapshotInsight({
  icon: Icon,
  value,
  label,
  description,
  href
}: {
  icon: LucideIcon
  value: string
  label: string
  description: string
  href: string
}) {
  return (
    <Link
      to={href}
      className='group rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md'
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'>
          <Icon className='size-4' />
        </div>
        <ArrowRight className='size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary' />
      </div>
      <p className='mt-4 text-2xl font-black tabular-nums text-foreground'>{value}</p>
      <p className='mt-1 text-xs font-bold text-foreground'>{label}</p>
      <p className='mt-1 text-[11px] leading-relaxed text-muted-foreground'>{description}</p>
    </Link>
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
