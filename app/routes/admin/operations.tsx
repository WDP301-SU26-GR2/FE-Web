import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, BarChart3, Library, Search, ShieldAlert, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

interface OperationItem {
  href: string
  icon: LucideIcon
  title: string
  description: string
}

export default function AdminOperationsRoute() {
  const { t } = useTranslation('admin')
  const items: OperationItem[] = [
    {
      href: '/dashboard/admin/operations/monitoring',
      icon: Search,
      title: t('operations.monitoring.title'),
      description: t('operations.monitoring.description')
    },
    {
      href: '/dashboard/admin/operations/surveys',
      icon: BarChart3,
      title: t('operations.surveys.title'),
      description: t('operations.surveys.description')
    },
    {
      href: '/dashboard/admin/operations/publication-versions',
      icon: Library,
      title: t('operations.publicationVersions.title'),
      description: t('operations.publicationVersions.description')
    }
  ]

  return (
    <div className='space-y-7 pb-12'>
      <Link to='/dashboard/admin' className='inline-flex items-center gap-2 text-sm font-bold text-primary'>
        <ArrowLeft className='size-4' />
        {t('navigation.backDashboard')}
      </Link>
      <header>
        <div className='mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Wrench className='size-4' aria-hidden='true' />
          <span>{t('operations.eyebrow')}</span>
        </div>
        <h1 className='text-2xl font-bold tracking-tight text-foreground md:text-3xl'>{t('operations.title')}</h1>
        <p className='mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground'>{t('operations.subtitle')}</p>
      </header>

      <div className='flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4'>
        <ShieldAlert className='mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400' aria-hidden='true' />
        <div>
          <p className='text-sm font-bold text-foreground'>{t('operations.notice.title')}</p>
          <p className='mt-1 text-sm leading-relaxed text-muted-foreground'>{t('operations.notice.description')}</p>
        </div>
      </div>

      <section className='grid gap-4 md:grid-cols-2'>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              to={item.href}
              className='group rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              <div className='mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Icon className='size-5' aria-hidden='true' />
              </div>
              <h2 className='font-bold text-foreground group-hover:text-primary'>{item.title}</h2>
              <p className='mt-2 text-sm leading-relaxed text-muted-foreground'>{item.description}</p>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
