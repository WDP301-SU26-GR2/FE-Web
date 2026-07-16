import { Link } from 'react-router'
import {
  BarChart3,
  BookCopy,
  CalendarRange,
  ChevronRight,
  GitPullRequestArrow,
  Library,
  RefreshCcw,
  Star,
  TrendingUp,
  Wrench
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function EditorOperationsPage() {
  const { t } = useTranslation('editor')
  const items = [
    ['lifecycle', RefreshCcw],
    ['sales', TrendingUp],
    ['reviews', Star],
    ['deadlines', CalendarRange],
    ['surveys', BarChart3],
    ['reprints', BookCopy],
    ['transfers', GitPullRequestArrow],
    ['versions', Library]
  ] as const

  return (
    <div className='space-y-7 pb-12'>
      <header>
        <p className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Wrench className='size-4' />
          {t('operations.eyebrow')}
        </p>
        <h1 className='mt-2 text-3xl font-bold text-foreground'>{t('operations.title')}</h1>
        <p className='mt-2 text-sm text-muted-foreground'>{t('operations.subtitle')}</p>
      </header>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {items.map(([key, Icon]) => (
          <Link
            key={key}
            to={`/dashboard/editor/operations/${key}`}
            className='group rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary'
          >
            <Icon className='size-6 text-primary' />
            <h2 className='mt-4 font-bold text-foreground'>{t(`operations.${key}`)}</h2>
            <p className='mt-2 min-h-10 text-sm text-muted-foreground'>{t(`operations.descriptions.${key}`)}</p>
            <span className='mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary'>
              {t('operations.open')}
              <ChevronRight className='size-4 transition-transform group-hover:translate-x-1' />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
