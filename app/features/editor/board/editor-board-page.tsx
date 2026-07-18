import { Link } from 'react-router'
import { BarChart3, CalendarClock, ChevronRight, FileText, Gavel, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function EditorBoardPage() {
  const { t } = useTranslation('editor')
  const sections = [
    ['pitching', Send],
    ['sessions', CalendarClock],
    ['decisions', Gavel],
    ['reports', FileText],
    ['lifecycle', BarChart3]
  ] as const
  return (
    <div className='space-y-7 pb-12'>
      <header>
        <p className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Gavel className='size-4' />
          {t('board.eyebrow')}
        </p>
        <h1 className='mt-2 text-3xl font-bold text-foreground'>{t('board.title')}</h1>
        <p className='mt-2 text-sm text-muted-foreground'>{t('board.subtitle')}</p>
      </header>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {sections.map(([key, Icon]) => (
          <Link
            key={key}
            to={`/dashboard/editor/board/${key}`}
            className='group rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary'
          >
            <Icon className='size-6 text-primary' />
            <h2 className='mt-4 font-bold text-foreground'>{t(`board.sections.${key}`)}</h2>
            <p className='mt-2 min-h-10 text-sm text-muted-foreground'>{t(`board.sectionDescriptions.${key}`)}</p>
            <span className='mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary'>
              {t('board.openSection')}
              <ChevronRight className='size-4 transition-transform group-hover:translate-x-1' />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
