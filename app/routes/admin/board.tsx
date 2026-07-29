import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  Gavel,
  Radio,
  ShieldAlert,
  UsersRound
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

interface OversightItem {
  href: string
  icon: LucideIcon
  title: string
  description: string
  mode: 'monitoring' | 'intervention'
}

export default function AdminBoardRoute() {
  const { t } = useTranslation('admin')

  const items: OversightItem[] = [
    {
      href: '/dashboard/admin/board/sessions',
      icon: Radio,
      title: t('boardOversight.sessions.title'),
      description: t('boardOversight.sessions.description'),
      mode: 'intervention'
    },
    {
      href: '/dashboard/admin/board/reports',
      icon: FileText,
      title: t('boardOversight.reports.title'),
      description: t('boardOversight.reports.description'),
      mode: 'monitoring'
    },
    {
      href: '/dashboard/admin/board/decisions',
      icon: ClipboardList,
      title: t('boardOversight.decisions.title'),
      description: t('boardOversight.decisions.description'),
      mode: 'intervention'
    },
    {
      href: '/dashboard/admin/board/payments',
      icon: BriefcaseBusiness,
      title: t('boardOversight.payments.title'),
      description: t('boardOversight.payments.description'),
      mode: 'intervention'
    }
  ]

  return (
    <div className='space-y-7 pb-12'>
      <Link to='/dashboard/admin' className='inline-flex items-center gap-2 text-xs font-bold text-primary'>
        <ArrowLeft className='size-4' />
        {t('navigation.backDashboard')}
      </Link>

      <section className='relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8'>
        <div className='absolute -right-20 -top-24 size-72 rounded-full bg-primary/10 blur-3xl' />
        <div className='relative grid gap-7 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-center'>
          <header>
            <div className='mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
              <Gavel className='size-4' aria-hidden='true' />
              <span>{t('boardOversight.eyebrow')}</span>
            </div>
            <h1 className='text-2xl font-black tracking-tight text-foreground md:text-3xl'>
              {t('boardOversight.title')}
            </h1>
            <p className='mt-3 max-w-3xl text-sm leading-6 text-muted-foreground'>{t('boardOversight.subtitle')}</p>
          </header>

          <div className='rounded-2xl border border-primary/20 bg-primary/10 p-5'>
            <div className='flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
                <UsersRound className='size-5' />
              </div>
              <div>
                <p className='text-xs font-bold text-foreground'>{t('boardOversight.roleBoundary.title')}</p>
                <p className='mt-0.5 text-[11px] text-muted-foreground'>
                  {t('boardOversight.roleBoundary.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='grid gap-3 md:grid-cols-3'>
        {['editor', 'board', 'admin'].map((step, index) => (
          <div key={step} className='relative rounded-2xl border border-border bg-card p-4 shadow-sm'>
            <span className='flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary'>
              {index + 1}
            </span>
            <p className='mt-3 text-xs font-bold text-foreground'>{t(`boardOversight.workflow.${step}.title`)}</p>
            <p className='mt-1 text-[11px] leading-relaxed text-muted-foreground'>
              {t(`boardOversight.workflow.${step}.description`)}
            </p>
            {index < 2 && (
              <ArrowRight className='absolute -right-2.5 top-1/2 z-10 hidden size-5 rounded-full bg-background text-primary md:block' />
            )}
          </div>
        ))}
      </section>

      <div className='flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4'>
        <ShieldAlert className='mt-0.5 size-5 shrink-0 text-primary' aria-hidden='true' />
        <div>
          <p className='text-xs font-bold text-foreground'>{t('boardOversight.notice.title')}</p>
          <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>{t('boardOversight.notice.description')}</p>
        </div>
      </div>

      <section>
        <div className='mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end'>
          <div>
            <h2 className='text-lg font-bold text-foreground'>{t('boardOversight.tools.title')}</h2>
            <p className='mt-1 text-xs text-muted-foreground'>{t('boardOversight.tools.description')}</p>
          </div>
          <div className='flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider'>
            <span className='rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground'>
              {t('boardOversight.mode.monitoring')}
            </span>
            <span className='rounded-full bg-primary/10 px-3 py-1.5 text-primary'>
              {t('boardOversight.mode.intervention')}
            </span>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {items.map((item, index) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                className='group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                    <Icon className='size-5' aria-hidden='true' />
                  </div>
                  <span className='text-3xl font-black text-muted/80'>0{index + 1}</span>
                </div>
                <span
                  className={`mt-5 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    item.mode === 'monitoring' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                  }`}
                >
                  {t(`boardOversight.mode.${item.mode}`)}
                </span>
                <h3 className='mt-3 font-bold text-foreground group-hover:text-primary'>{item.title}</h3>
                <p className='mt-2 min-h-12 text-xs leading-relaxed text-muted-foreground'>{item.description}</p>
                <div className='mt-5 flex items-center gap-2 text-xs font-bold text-primary'>
                  {t('boardOversight.tools.open')}
                  <ArrowRight className='size-4 transition-transform group-hover:translate-x-1' />
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
