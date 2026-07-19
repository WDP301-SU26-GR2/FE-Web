import {
  BadgeDollarSign,
  Bell,
  CalendarClock,
  ChartNoAxesCombined,
  ClipboardCheck,
  FileSignature,
  FileText,
  History,
  RefreshCcw,
  Scale,
  UserRoundCog,
  UsersRound
} from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { BoardHeader } from '../components/board-ui'
import type { BoardDashboardResDtoOutput } from '~/api/model/dashboard/boardDashboardResDtoOutput'

const sections = [
  ['sessions', UsersRound],
  ['decisions', ClipboardCheck],
  ['reports', FileText],
  ['contracts', FileSignature],
  ['payments', BadgeDollarSign],
  ['deadlines', CalendarClock],
  ['rankings', ChartNoAxesCombined],
  ['reprints', RefreshCcw],
  ['transfers', Scale],
  ['audit', History],
  ['notifications', Bell],
  ['profile', UserRoundCog]
] as const

export function BoardDashboardPage({ dashboard, hasError }: { dashboard: BoardDashboardResDtoOutput | null; hasError: boolean }) {
  const { t } = useTranslation('board')
  return (
    <div className='space-y-7 pb-12'>
      <BoardHeader title={t('dashboard.title')} description={t('dashboard.description')} />
      {hasError ? <p className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>{t('dashboard.liveDataError')}</p> : null}
      {dashboard ? (
        <>
          <div className='grid gap-3 sm:grid-cols-3'>
            <BoardSummary label={t('dashboard.summary.pending')} value={dashboard.pendingDecisions.length} href='/dashboard/board/decisions' />
            <BoardSummary label={t('dashboard.summary.upcoming')} value={dashboard.upcomingSessions} href='/dashboard/board/sessions' />
            <BoardSummary label={t('dashboard.summary.unread')} value={dashboard.unreadNotifications} href='/dashboard/board/notifications' />
          </div>
          <div className='grid gap-4 lg:grid-cols-2'>
            <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
              <h2 className='font-bold text-foreground'>{t('dashboard.pendingDecisions')}</h2>
              <div className='mt-4 space-y-2'>
                {dashboard.pendingDecisions.slice(0, 5).map((decision) => (
                  <Link key={decision.decisionId} to={`/dashboard/board/decisions/${decision.decisionId}`} className='block rounded-lg border border-border p-3 hover:border-primary'>
                    <p className='font-semibold text-foreground'>{decision.targetSeries?.title ?? decision.decisionType}</p>
                    <p className='mt-1 text-xs text-muted-foreground'>{decision.decisionType} · {decision.phase} · {decision.result}</p>
                  </Link>
                ))}
                {dashboard.pendingDecisions.length === 0 ? <p className='text-sm text-muted-foreground'>{t('dashboard.emptyPending')}</p> : null}
              </div>
            </section>
            <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
              <h2 className='font-bold text-foreground'>{t('dashboard.severeRisk')}</h2>
              <div className='mt-4 space-y-2'>
                {dashboard.atRiskSevere.slice(0, 5).map((series) => (
                  <Link key={series.seriesId} to='/dashboard/board/rankings' className='block rounded-lg border border-border p-3 hover:border-primary'>
                    <p className='font-semibold text-foreground'>{series.title}</p>
                    <p className='mt-1 text-xs text-muted-foreground'>{series.rankPosition ? `#${series.rankPosition}` : t('dashboard.unranked')}</p>
                  </Link>
                ))}
                {dashboard.atRiskSevere.length === 0 ? <p className='text-sm text-muted-foreground'>{t('dashboard.emptyRisk')}</p> : null}
              </div>
            </section>
          </div>
        </>
      ) : null}
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {sections.map(([key, Icon]) => (
          <Link
            key={key}
            to={`/dashboard/board/${key}`}
            className='rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary'
          >
            <Icon className='size-6 text-primary' />
            <h2 className='mt-4 font-bold text-foreground'>{t(`nav.${key}`)}</h2>
            <p className='mt-2 text-sm text-muted-foreground'>{t(`dashboard.sections.${key}`)}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function BoardSummary({ label, value, href }: { label: string; value: number; href: string }) {
  return <Link to={href} className='rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary'><p className='text-sm text-muted-foreground'>{label}</p><p className='mt-2 text-3xl font-bold text-foreground'>{value}</p></Link>
}
