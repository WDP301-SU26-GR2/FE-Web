import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, ClipboardList, FileText, Gavel, ShieldAlert, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

interface OversightItem {
  href: string
  icon: LucideIcon
  title: string
  description: string
}

export default function AdminBoardRoute() {
  const { t } = useTranslation('admin')

  const monitoringItems: OversightItem[] = [
    {
      href: '/dashboard/admin/board/sessions',
      icon: Gavel,
      title: t('boardOversight.sessions.title'),
      description: t('boardOversight.sessions.description')
    },
    {
      href: '/dashboard/admin/board/reports',
      icon: FileText,
      title: t('boardOversight.reports.title'),
      description: t('boardOversight.reports.description')
    }
  ]
  const interventionItems: OversightItem[] = [
    {
      href: '/dashboard/admin/board/decisions',
      icon: ClipboardList,
      title: t('boardOversight.decisions.title'),
      description: t('boardOversight.decisions.description')
    },
    {
      href: '/dashboard/admin/board/lifecycle',
      icon: TrendingUp,
      title: t('boardOversight.lifecycle.title'),
      description: t('boardOversight.lifecycle.description')
    },
    {
      href: '/dashboard/admin/board/payments',
      icon: ShieldAlert,
      title: t('boardOversight.payments.title'),
      description: t('boardOversight.payments.description')
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
          <ShieldAlert className='size-4' aria-hidden='true' />
          <span>{t('boardOversight.eyebrow')}</span>
        </div>
        <h1 className='text-2xl font-bold tracking-tight text-foreground md:text-3xl'>{t('boardOversight.title')}</h1>
        <p className='mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground'>{t('boardOversight.subtitle')}</p>
      </header>

      <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 p-4'>
        <div className='flex items-start gap-3'>
          <ShieldAlert className='mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400' aria-hidden='true' />
          <div>
            <p className='text-sm font-bold text-foreground'>{t('boardOversight.notice.title')}</p>
            <p className='mt-1 text-sm leading-relaxed text-muted-foreground'>{t('boardOversight.notice.description')}</p>
          </div>
        </div>
      </div>

      <OversightSection
        title={t('boardOversight.monitoring.title')}
        description={t('boardOversight.monitoring.description')}
        items={monitoringItems}
      />
      <OversightSection
        title={t('boardOversight.intervention.title')}
        description={t('boardOversight.intervention.description')}
        items={interventionItems}
      />
    </div>
  )
}

function OversightSection({ title, description, items }: { title: string; description: string; items: OversightItem[] }) {
  return (
    <section className='space-y-3'>
      <div>
        <h2 className='text-lg font-bold text-foreground'>{title}</h2>
        <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
      </div>
      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
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
              <h3 className='font-bold text-foreground group-hover:text-primary'>{item.title}</h3>
              <p className='mt-2 text-sm leading-relaxed text-muted-foreground'>{item.description}</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
