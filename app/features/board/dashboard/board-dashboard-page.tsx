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
  ['sessions', UsersRound, 'bg-info/10 text-info'],
  ['decisions', ClipboardCheck, 'bg-primary/10 text-primary'],
  ['contracts', FileSignature, 'bg-warning/10 text-warning'],
  ['payments', BadgeDollarSign, 'bg-success/10 text-success'],
  ['deadlines', CalendarClock, 'bg-warning/10 text-warning'],
  ['rankings', ChartNoAxesCombined, 'bg-info/10 text-info'],
  ['reprints', RefreshCcw, 'bg-success/10 text-success'],
  ['transfers', Scale, 'bg-primary/10 text-primary'],
  ['audit', History, 'bg-muted text-muted-foreground'],
  ['reference', LibraryBig, 'bg-info/10 text-info'],
  ['notifications', Bell, 'bg-destructive/10 text-destructive'],
  ['profile', UserRoundCog, 'bg-primary/10 text-primary']
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
