import { useTranslation } from 'react-i18next'
import {
  Clock,
  Calendar,
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
  RefreshCw
} from 'lucide-react'

export function MangakaDashboard() {
  const { t } = useTranslation('mangaka')

  // Mock data for Active Series
  const activeSeries = [
    {
      id: 'series-1',
      title: 'Neon Genesis: Rebirth',
      subtitle: 'Chapter 42 in Production',
      status: 'ONGOING',
      statusColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      initials: 'NR',
      gradient: 'from-blue-600 to-indigo-700'
    },
    {
      id: 'series-2',
      title: 'The Silent Weaver',
      subtitle: 'Reviewing Feedback',
      status: 'ONGOING',
      statusColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      initials: 'SW',
      gradient: 'from-purple-600 to-pink-700'
    },
    {
      id: 'series-3',
      title: 'Shadow Protocol',
      subtitle: 'Manuscript Approved',
      status: 'HIATUS',
      statusColor: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
      initials: 'SP',
      gradient: 'from-neutral-700 to-slate-900'
    }
  ]

  // Mock data for Weekly Rankings
  const rankings = [
    { rank: 1, name: 'Shadow Protocol', change: '+2 pos', changeColor: 'text-emerald-500' },
    { rank: 2, name: 'Neon Genesis', change: 'Steady', changeColor: 'text-muted-foreground' },
    { rank: 3, name: 'The Silent Weaver', change: '-1 pos', changeColor: 'text-rose-500' }
  ]

  // Mock data for Action Inbox
  const inboxItems = [
    {
      id: 'inbox-1',
      title: "Chapter 43 'Name' Rejected",
      desc: "Editor: 'Pacing in scene 3 needs adjustment.'",
      type: 'reject',
      icon: AlertCircle,
      color: 'border-rose-500/20 bg-rose-500/5 text-rose-500'
    },
    {
      id: 'inbox-2',
      title: 'New Merchandise Contract',
      desc: 'Awaiting mangaka signature for Licensing Deal B.',
      type: 'contract',
      icon: FileText,
      color: 'border-amber-500/20 bg-amber-500/5 text-amber-500'
    },
    {
      id: 'inbox-3',
      title: 'AI Background Assist Ready',
      desc: 'Composite layers generated for Series 01-Ch42.',
      type: 'ai',
      icon: Sparkles,
      color: 'border-primary/20 bg-primary/5 text-primary'
    }
  ]

  return (
    <div className='space-y-8 pb-16'>
      {/* Dashboard Top Intro */}
      <div>
        <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>{t('dashboard.title')}</h1>
        <p className='mt-2 text-sm text-muted-foreground'>{t('dashboard.subtitle', { count: 3 })}</p>
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
              <span className='inline-flex items-center rounded-md bg-rose-500/10 border border-rose-500/25 px-2.5 py-0.5 text-xs font-extrabold tracking-wider text-rose-500'>
                {t('dashboard.actionRequired')}
              </span>
            </div>

            {/* Deadline cards */}
            <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {/* Card 1 */}
              <div className='flex flex-col justify-between rounded-lg border border-border bg-background/50 p-4 transition-all hover:border-primary/30'>
                <div>
                  <h3 className='text-sm font-bold'>Neon Genesis: Rebirth</h3>
                  <p className='mt-1 text-xs text-muted-foreground font-semibold'>Ch. 42 Manuscript Submission</p>
                </div>
                <div className='mt-6 flex items-center justify-between'>
                  <div className='flex items-center gap-1.5 text-xs font-bold text-rose-500'>
                    <Clock className='h-3.5 w-3.5' />
                    <span>{t('dashboard.dueInHours', { hours: 14 })}</span>
                  </div>
                  <button className='flex items-center gap-1 rounded bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer'>
                    <span>{t('dashboard.openStudio')}</span>
                    <ArrowUpRight className='h-3 w-3' />
                  </button>
                </div>
              </div>

              {/* Card 2 */}
              <div className='flex flex-col justify-between rounded-lg border border-border bg-background/50 p-4 transition-all hover:border-primary/30'>
                <div>
                  <h3 className='text-sm font-bold'>The Silent Weaver</h3>
                  <p className='mt-1 text-xs text-muted-foreground font-semibold'>Review: Background Cleanup</p>
                </div>
                <div className='mt-6 flex items-center justify-between'>
                  <div className='flex items-center gap-1.5 text-xs font-bold text-amber-500'>
                    <Calendar className='h-3.5 w-3.5' />
                    <span>{t('dashboard.dueInDays', { days: 2 })}</span>
                  </div>
                  <button className='flex items-center gap-1 rounded bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer'>
                    <span>{t('dashboard.openReview')}</span>
                    <ArrowUpRight className='h-3 w-3' />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE SERIES LIST */}
          <div className='rounded-xl border border-border bg-card p-6 shadow-md'>
            <div className='flex items-center justify-between'>
              <h2 className='text-base font-bold tracking-wide'>{t('dashboard.activeSeries')}</h2>
              <button className='rounded-lg p-1.5 hover:bg-muted text-muted-foreground transition-all cursor-pointer'>
                <MoreVertical className='h-5 w-5' />
              </button>
            </div>

            <div className='mt-4 divide-y divide-border'>
              {activeSeries.map((series) => (
                <div key={series.id} className='flex items-center justify-between py-4 first:pt-0 last:pb-0'>
                  <div className='flex items-center gap-4'>
                    {/* Stylized Cover Art Placeholder */}
                    <div
                      className={`flex h-12 w-9 shrink-0 items-center justify-center rounded bg-gradient-to-br ${series.gradient} font-extrabold text-[11px] text-white shadow`}
                    >
                      {series.initials}
                    </div>
                    <div>
                      <h3 className='text-sm font-bold leading-tight'>{series.title}</h3>
                      <p className='mt-0.5 text-xs text-muted-foreground'>{series.subtitle}</p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${series.statusColor}`}
                  >
                    {series.status}
                  </span>
                </div>
              ))}
            </div>
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

              <div className='mt-4 space-y-3'>
                {rankings.map((item) => (
                  <div
                    key={item.rank}
                    className='flex items-center justify-between rounded-lg border border-border bg-background/30 p-3 text-sm'
                  >
                    <div className='flex items-center gap-3'>
                      <span className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary'>
                        {item.rank}
                      </span>
                      <span className='font-semibold truncate max-w-[130px]'>{item.name}</span>
                    </div>
                    <span className={`text-xs font-bold ${item.changeColor}`}>{item.change}</span>
                  </div>
                ))}
              </div>
            </div>

            <button className='mt-6 flex w-full items-center justify-center gap-1 text-center text-xs font-bold text-primary hover:underline cursor-pointer'>
              <span>{t('dashboard.viewAnalyticsReport')}</span>
              <ChevronRight className='h-3.5 w-3.5' />
            </button>
          </div>

          {/* ACTION INBOX */}
          <div className='rounded-xl border border-border bg-card p-6 shadow-md'>
            <div className='flex items-center justify-between'>
              <h2 className='text-base font-bold tracking-wide'>{t('dashboard.actionInbox')}</h2>
              <span className='flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow shadow-primary/20'>
                4
              </span>
            </div>

            <div className='mt-4 space-y-3'>
              {inboxItems.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 rounded-lg border p-4 transition-all hover:scale-[1.01] cursor-pointer ${item.color}`}
                  >
                    <Icon className='h-5 w-5 shrink-0 mt-0.5' />
                    <div className='min-w-0'>
                      <h4 className='text-xs font-bold truncate text-foreground'>{item.title}</h4>
                      <p className='mt-1 text-[11px] text-muted-foreground leading-normal'>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Footer (Bottom Actions & engine status info) */}
      <div className='flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row'>
        <div className='flex items-center gap-6'>
          <button className='flex items-center gap-2 hover:text-foreground font-semibold transition-colors cursor-pointer'>
            <Upload className='h-4 w-4' />
            <span>{t('dashboard.uploadBatch')}</span>
          </button>
          <button className='flex items-center gap-2 hover:text-foreground font-semibold transition-colors cursor-pointer'>
            <HelpCircle className='h-4 w-4' />
            <span>{t('dashboard.editorSupport')}</span>
          </button>
        </div>
        <div className='flex items-center gap-1.5 text-muted-foreground/80 font-medium'>
          <RefreshCw className='h-3.5 w-3.5 text-primary shrink-0 animate-spin-slow' />
          <span>{t('dashboard.engineStatus', { time: '2m' })}</span>
        </div>
      </div>
    </div>
  )
}
