import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Search,
  ShieldAlert,
  Telescope,
  Wrench
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

interface OperationItem {
  href: string
  icon: LucideIcon
  title: string
  description: string
  mode: 'readOnly' | 'write'
  featured?: boolean
}

export default function AdminOperationsRoute() {
  const { t } = useTranslation('admin')
  const items: OperationItem[] = [
    {
      href: '/dashboard/admin/operations/magazine-survey',
      icon: BarChart3,
      title: t('operations.magazineSurvey.title'),
      description: t('operations.magazineSurvey.description'),
      mode: 'write',
      featured: true
    },
    {
      href: '/dashboard/admin/operations/monitoring',
      icon: Search,
      title: t('operations.monitoring.title'),
      description: t('operations.monitoring.description'),
      mode: 'readOnly'
    },
    {
      href: '/dashboard/admin/operations/reference?returnTo=/dashboard/admin/operations',
      icon: Telescope,
      title: t('operations.reference.title'),
      description: t('operations.reference.description'),
      mode: 'readOnly'
    }
  ]

  return (
    <div className='space-y-7 pb-12'>
      <Link to='/dashboard/admin' className='inline-flex items-center gap-2 text-xs font-bold text-primary'>
        <ArrowLeft className='size-4' />
        {t('navigation.backDashboard')}
      </Link>

      <section className='relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8'>
        <div className='absolute -right-16 -top-20 size-64 rounded-full bg-primary/10 blur-3xl' />
        <div className='relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-center'>
          <header>
            <div className='mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
              <Wrench className='size-4' aria-hidden='true' />
              <span>{t('operations.eyebrow')}</span>
            </div>
            <h1 className='text-2xl font-black tracking-tight text-foreground md:text-3xl'>{t('operations.title')}</h1>
            <p className='mt-3 max-w-3xl text-sm leading-6 text-muted-foreground'>{t('operations.subtitle')}</p>
          </header>
          <div className='grid grid-cols-2 gap-3'>
            <div className='rounded-2xl border border-border bg-background/70 p-4'>
              <Search className='size-5 text-muted-foreground' />
              <p className='mt-3 text-xl font-black text-foreground'>02</p>
              <p className='mt-1 text-[11px] font-bold text-muted-foreground'>{t('operations.summary.readOnly')}</p>
            </div>
            <div className='rounded-2xl border border-primary/20 bg-primary/10 p-4'>
              <BarChart3 className='size-5 text-primary' />
              <p className='mt-3 text-xl font-black text-foreground'>01</p>
              <p className='mt-1 text-[11px] font-bold text-muted-foreground'>{t('operations.summary.write')}</p>
            </div>
          </div>
        </div>
      </section>

      <div className='flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4'>
        <ShieldAlert className='mt-0.5 size-5 shrink-0 text-primary' aria-hidden='true' />
        <div>
          <p className='text-xs font-bold text-foreground'>{t('operations.notice.title')}</p>
          <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>{t('operations.notice.description')}</p>
        </div>
      </div>

      <section>
        <div className='mb-4'>
          <h2 className='text-lg font-bold text-foreground'>{t('operations.workspace.title')}</h2>
          <p className='mt-1 text-xs text-muted-foreground'>{t('operations.workspace.description')}</p>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          {items.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  item.featured ? 'border-primary/40 ring-1 ring-primary/10' : 'border-border hover:border-primary/40'
                }`}
              >
                {item.featured && (
                  <span className='absolute right-0 top-0 rounded-bl-xl bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground'>
                    {t('operations.surveys.adminOnly')}
                  </span>
                )}
                <div className='flex items-start gap-4'>
                  <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                    <Icon className='size-5' aria-hidden='true' />
                  </div>
                  <div className='min-w-0 pr-10'>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        item.mode === 'readOnly' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {t(`operations.mode.${item.mode}`)}
                    </span>
                    <h3 className='mt-3 font-bold text-foreground group-hover:text-primary'>{item.title}</h3>
                    <p className='mt-2 text-xs leading-relaxed text-muted-foreground'>{item.description}</p>
                  </div>
                </div>
                <div className='mt-5 flex items-center justify-between border-t border-border pt-4 text-xs font-bold text-primary'>
                  <span>{t('operations.workspace.open')}</span>
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
