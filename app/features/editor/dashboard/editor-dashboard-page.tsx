import { Link } from 'react-router'
import { AlertTriangle, Bell, BookCheck, FileClock, FileSignature, Gavel, Send, Sparkles, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { EditorDashboardResDtoOutput } from '~/api/model/dashboard/editorDashboardResDtoOutput'

export function EditorDashboardPage({
  dashboard,
  hasError
}: {
  dashboard: EditorDashboardResDtoOutput | null
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  return (
    <div className='space-y-6 pb-12'>
      <header className='rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8'>
        <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Sparkles className='size-4' />
          {t('dashboard.eyebrow')}
        </div>
        <h1 className='mt-3 text-3xl font-bold tracking-tight text-foreground'>{t('dashboard.title')}</h1>
        <p className='mt-3 max-w-3xl text-sm leading-6 text-muted-foreground'>{t('dashboard.subtitle')}</p>
      </header>
      {hasError ? (
        <p className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
          {t('dashboard.liveDataError')}
        </p>
      ) : null}
      {dashboard ? (
        <>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <SummaryCard label={t('dashboard.summary.reviewQueue')} value={dashboard.reviewQueue} href='/dashboard/editor/proposals' />
            <SummaryCard label={t('dashboard.summary.mySeries')} value={dashboard.mySeries.total} href='/dashboard/editor/proposals' />
            <SummaryCard label={t('dashboard.summary.pendingContracts')} value={dashboard.pendingContracts.length} href='/dashboard/editor/contracts' />
            <SummaryCard label={t('dashboard.summary.unread')} value={dashboard.unreadNotifications} href='/dashboard/editor/notifications' />
          </div>
          {(dashboard.productionAlerts.length > 0 || dashboard.atRisk.length > 0) && (
            <section className='grid gap-4 lg:grid-cols-2'>
              <DashboardList title={t('dashboard.alerts.production')} icon={AlertTriangle}>
                {dashboard.productionAlerts.slice(0, 5).map((alert) => (
                  <Link key={alert.chapterId} to={`/dashboard/editor/publication/${alert.seriesId}/${alert.chapterId}`} className='block rounded-lg border border-border p-3 hover:border-primary'>
                    <p className='font-semibold text-foreground'>{alert.seriesTitle} · #{alert.chapterNumber}</p>
                    <p className='mt-1 text-xs text-muted-foreground'>{alert.warningLevel} · {alert.progressPct}% · {alert.pagesReady}/{alert.totalPages} {t('dashboard.alerts.pagesReady')}</p>
                  </Link>
                ))}
              </DashboardList>
              <DashboardList title={t('dashboard.alerts.atRisk')} icon={Bell}>
                {dashboard.atRisk.slice(0, 5).map((series) => (
                  <Link key={series.seriesId} to={`/dashboard/editor/proposals/${series.seriesId}`} className='block rounded-lg border border-border p-3 hover:border-primary'>
                    <p className='font-semibold text-foreground'>{series.title}</p>
                    <p className='mt-1 text-xs text-muted-foreground'>{series.riskLevel}{series.rankPosition ? ` · #${series.rankPosition}` : ''}</p>
                  </Link>
                ))}
              </DashboardList>
            </section>
          )}
        </>
      ) : null}
      <div className='grid gap-4 md:grid-cols-2'>
        <WorkflowCard
          icon={FileClock}
          title={t('dashboard.proposals.title')}
          description={t('dashboard.proposals.description')}
          href='/dashboard/editor/proposals'
          action={t('dashboard.proposals.action')}
        />
        <WorkflowCard
          icon={Gavel}
          title={t('dashboard.board.title')}
          description={t('dashboard.board.description')}
          href='/dashboard/editor/board'
          action={t('dashboard.board.action')}
        />
        <WorkflowCard
          icon={FileSignature}
          title={t('dashboard.contracts.title')}
          description={t('dashboard.contracts.description')}
          href='/dashboard/editor/contracts'
          action={t('dashboard.contracts.action')}
        />
        <WorkflowCard
          icon={BookCheck}
          title={t('dashboard.publication.title')}
          description={t('dashboard.publication.description')}
          href='/dashboard/editor/publication'
          action={t('dashboard.publication.action')}
        />
        <WorkflowCard
          icon={Wrench}
          title={t('dashboard.operations.title')}
          description={t('dashboard.operations.description')}
          href='/dashboard/editor/operations'
          action={t('dashboard.operations.action')}
        />
      </div>
    </div>
  )
}

function SummaryCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link to={href} className='rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary'>
      <p className='text-sm text-muted-foreground'>{label}</p>
      <p className='mt-2 text-3xl font-bold text-foreground'>{value}</p>
    </Link>
  )
}

function DashboardList({ title, icon: Icon, children }: { title: string; icon: typeof AlertTriangle; children: React.ReactNode }) {
  return (
    <article className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <h2 className='flex items-center gap-2 font-bold text-foreground'><Icon className='size-5 text-primary' />{title}</h2>
      <div className='mt-4 space-y-2'>{children}</div>
    </article>
  )
}

function WorkflowCard({
  icon: Icon,
  title,
  description,
  href,
  action
}: {
  icon: typeof FileClock
  title: string
  description: string
  href: string
  action: string
}) {
  return (
    <article className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
      <div className='flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary'>
        <Icon className='size-5' />
      </div>
      <h2 className='mt-5 text-xl font-bold text-foreground'>{title}</h2>
      <p className='mt-2 min-h-12 text-sm leading-6 text-muted-foreground'>{description}</p>
      <Link
        to={href}
        className='mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90'
      >
        {action}
        <Send className='size-4' />
      </Link>
    </article>
  )
}
