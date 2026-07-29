import {
  BadgeDollarSign,
  Bell,
  CalendarClock,
  ChartNoAxesCombined,
  ClipboardCheck,
  FileSignature,
  History,
  LibraryBig,
  RefreshCcw,
  Scale,
  UserRoundCog,
  UsersRound
} from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { BoardHeader } from '../components/board-ui'
import type { BoardConfigResDtoOutput } from '~/api/model/board'
import type { BoardDashboardResDtoOutput } from '~/api/model/dashboard/boardDashboardResDtoOutput'
import { SemanticStatusBadge } from '~/shared/components/status-badge'
import { cn } from '~/shared/lib/cn'

const sections = [
  ['sessions', UsersRound, 'bg-sky-500/10 text-sky-700 dark:text-sky-300'],
  ['decisions', ClipboardCheck, 'bg-violet-500/10 text-violet-700 dark:text-violet-300'],
  ['contracts', FileSignature, 'bg-amber-500/10 text-amber-700 dark:text-amber-300'],
  ['payments', BadgeDollarSign, 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'],
  ['deadlines', CalendarClock, 'bg-orange-500/10 text-orange-700 dark:text-orange-300'],
  ['rankings', ChartNoAxesCombined, 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'],
  ['reprints', RefreshCcw, 'bg-teal-500/10 text-teal-700 dark:text-teal-300'],
  ['transfers', Scale, 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300'],
  ['audit', History, 'bg-slate-500/10 text-slate-700 dark:text-slate-300'],
  ['reference', LibraryBig, 'bg-blue-500/10 text-blue-700 dark:text-blue-300'],
  ['notifications', Bell, 'bg-rose-500/10 text-rose-700 dark:text-rose-300'],
  ['profile', UserRoundCog, 'bg-purple-500/10 text-purple-700 dark:text-purple-300']
] as const

export function BoardDashboardPage({
  dashboard,
  config,
  hasError
}: {
  dashboard: BoardDashboardResDtoOutput | null
  config: BoardConfigResDtoOutput | null
  hasError: boolean
}) {
  const { t } = useTranslation('board')
  return (
    <div className='space-y-7 pb-12'>
      <BoardHeader title={t('dashboard.title')} description={t('dashboard.description')} />
      {hasError ? (
        <p className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive'>
          {t('dashboard.liveDataError')}
        </p>
      ) : null}
      {config ? (
        <section className='grid gap-3 rounded-xl border border-border bg-card p-5 shadow-sm sm:grid-cols-3'>
          <BoardConfigFact label={t('dashboard.config.members')} value={config.boardTotalMembers} />
          <BoardConfigFact label={t('dashboard.config.defaultRoster')} value={config.quorumMin} />
          <BoardConfigFact
            label={t('dashboard.config.majority')}
            value={`${Math.round(config.approveMajorityRatio * 100)}%`}
          />
        </section>
      ) : null}
      {dashboard ? (
        <>
          <div className='grid gap-3 sm:grid-cols-3'>
            <BoardSummary
              label={t('dashboard.summary.pending')}
              value={dashboard.pendingDecisions.length}
              href='/dashboard/board/decisions'
            />
            <BoardSummary
              label={t('dashboard.summary.upcoming')}
              value={dashboard.upcomingSessions}
              href='/dashboard/board/sessions'
            />
            <BoardSummary
              label={t('dashboard.summary.unread')}
              value={dashboard.unreadNotifications}
              href='/dashboard/board/notifications'
            />
          </div>
          <div className='space-y-4'>
            <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
              <h2 className='font-bold text-foreground'>{t('dashboard.pendingDecisions')}</h2>
              <div className='mt-4 space-y-2'>
                {dashboard.pendingDecisions.slice(0, 5).map((decision) => (
                  <Link
                    key={decision.decisionId}
                    to={`/dashboard/board/decisions/${decision.decisionId}`}
                    className='block rounded-lg border border-border p-3 hover:border-primary'
                  >
                    <p className='font-semibold text-foreground'>
                      {decision.targetSeries?.title ?? t(`filters.decisionTypes.${decision.decisionType}`)}
                    </p>
                    <div className='mt-2 flex flex-wrap items-center gap-1.5'>
                      <span className='text-xs text-muted-foreground'>
                        {t(`filters.decisionTypes.${decision.decisionType}`)}
                      </span>
                      <SemanticStatusBadge
                        value={decision.phase}
                        label={t(`filters.sessionPhases.${decision.phase}`)}
                      />
                      <SemanticStatusBadge
                        value={decision.result}
                        label={t(`filters.decisionResults.${decision.result}`)}
                      />
                    </div>
                  </Link>
                ))}
                {dashboard.pendingDecisions.length === 0 ? (
                  <p className='text-xs text-muted-foreground'>{t('dashboard.emptyPending')}</p>
                ) : null}
              </div>
            </section>
            <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
              <h2 className='font-bold text-foreground'>{t('dashboard.severeRisk')}</h2>
              <div className='mt-4 space-y-2'>
                {dashboard.atRiskSevere.slice(0, 5).map((series) => (
                  <Link
                    key={series.seriesId}
                    to='/dashboard/board/rankings'
                    className='block rounded-lg border border-border p-3 hover:border-primary'
                  >
                    <p className='font-semibold text-foreground'>{series.title}</p>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {series.rankPosition ? `#${series.rankPosition}` : t('dashboard.unranked')}
                    </p>
                  </Link>
                ))}
                {dashboard.atRiskSevere.length === 0 ? (
                  <p className='text-xs text-muted-foreground'>{t('dashboard.emptyRisk')}</p>
                ) : null}
              </div>
            </section>
          </div>
        </>
      ) : null}
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {sections.map(([key, Icon, tone]) => (
          <Link
            key={key}
            to={`/dashboard/board/${key}`}
            className='rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary'
          >
            <span className={cn('inline-flex size-11 items-center justify-center rounded-xl', tone)}>
              <Icon className='size-6' />
            </span>
            <h2 className='mt-4 font-bold text-foreground'>{t(`nav.${key}`)}</h2>
            <p className='mt-2 text-xs text-muted-foreground'>{t(`dashboard.sections.${key}`)}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function BoardConfigFact({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>{label}</p>
      <p className='mt-1 text-xl font-bold text-foreground'>{value}</p>
    </div>
  )
}

function BoardSummary({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link to={href} className='rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='mt-2 text-2xl font-bold text-foreground'>{value}</p>
    </Link>
  )
}
