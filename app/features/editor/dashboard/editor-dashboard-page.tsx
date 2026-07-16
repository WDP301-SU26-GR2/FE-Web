import { Link } from 'react-router'
import { BookCheck, FileClock, FileSignature, Gavel, Send, Sparkles, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function EditorDashboardPage() {
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
