import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

import { cn } from '~/shared/lib/cn'
import { SITE } from '~/shared/config/site'
import { ThemeToggle } from '~/shared/components/theme-toggle'
import { LanguageSwitcher } from '~/shared/components/language-switcher'

export type PublicationHeaderProps = {
  /** Optional series title for the breadcrumb subtitle. */
  seriesTitle?: string
  chapterNumber: number
  chapterTitle?: string | null
  /** Target for the "Back" link — typically `/dashboard/mangaka/series/:id`. */
  backHref: string
}

/**
 * Top bar for the Publication Workbench. Deliberately NOT `<DashboardLayout />`:
 * the user is in a focused, single-screen workspace and shouldn't see the
 * dashboard sidebar. We still keep the theme + language controls in the
 * header so the page feels consistent with the rest of the app.
 */
export function PublicationHeader({
  seriesTitle,
  chapterNumber,
  chapterTitle,
  backHref
}: PublicationHeaderProps) {
  const { t } = useTranslation('mangaka')

  return (
    <header className='flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6'>
      {/* Left: brand + chapter context */}
      <div className='flex min-w-0 items-center gap-3'>
        <div className='flex shrink-0 flex-col leading-tight'>
          <span className='text-base font-bold tracking-wider text-primary'>{SITE.name}</span>
          <span className='text-[10px] uppercase tracking-widest text-muted-foreground'>
            {t('publication.header.brandSubtitle')}
          </span>
        </div>
        <div className='hidden h-8 w-px shrink-0 bg-border sm:block' />
        <div className='min-w-0'>
          <p className='truncate text-sm font-semibold'>
            {t('publication.header.chapterContext', { series: seriesTitle ?? '—', n: chapterNumber })}
          </p>
          {chapterTitle ? (
            <p className='truncate text-xs text-muted-foreground'>{chapterTitle}</p>
          ) : (
            <p className='truncate text-xs text-muted-foreground'>{t('publication.header.workbenchLabel')}</p>
          )}
        </div>
      </div>

      {/* Right: back link + theme + language */}
      <div className='flex items-center gap-3'>
        <Link
          to={backHref}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted'
          )}
        >
          <ArrowLeft className='h-3.5 w-3.5' />
          <span className='hidden sm:inline'>{t('publication.header.backToSeries')}</span>
        </Link>
        <div className='h-6 w-px bg-border hidden sm:block' />
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
    </header>
  )
}
