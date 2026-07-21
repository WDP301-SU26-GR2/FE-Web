import { useTranslation } from 'react-i18next'
import { ArrowLeft, BookOpenText, LibraryBig } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { cn } from '~/shared/lib/cn'
import { SITE } from '~/shared/config/site'
import { ThemeToggle } from '~/shared/components/theme-toggle'
import { LanguageSwitcher } from '~/shared/components/language-switcher'
import { BrandLogo } from '~/shared/components/brand-logo'
import { usePublicationContext, isMissingRecordError } from '../publication-shell-context'

import { PublicationStatusPill } from './publication-status-pill'

type TabKey = 'name' | 'pages'

/**
 * Top bar for the Publication Workbench (split shell). Adds the Name/Page
 * segmented toggle + chapter context that read state from
 * `usePublicationContext()`. This deliberately does NOT nest under
 * `<DashboardLayout />` — the user is in a focused workspace and shouldn't
 * see the dashboard sidebar.
 *
 * The "Pages" tab is disabled when the Name isn't APPROVED yet (per
 * FE-API-Guide-v3 §10.5 — uploading pages requires an approved Name).
 */
export function PublicationShellHeader() {
  const { t } = useTranslation('mangaka')
  const location = useLocation()
  const { seriesId, chapterId, chapter, name, backHref } = usePublicationContext()

  const tabs: { key: TabKey; href: string; i18n: string; icon: typeof BookOpenText; enabled: boolean }[] = [
    {
      key: 'name',
      href: `/publish/${seriesId}/${chapterId}/name`,
      i18n: 'publication.header.tabName',
      icon: BookOpenText,
      enabled: true
    },
    {
      key: 'pages',
      href: `/publish/${seriesId}/${chapterId}/pages`,
      i18n: 'publication.header.tabPages',
      icon: LibraryBig,
      // Gate the Pages tab on Name approval. When the Name has never been
      // created (`name == null`) we keep the tab enabled but mark it as
      // disabled via tooltip so the affordance is still discoverable.
      enabled: name?.status === 'APPROVED'
    }
  ]

  // Determine active tab from current pathname — manual matching because
  // react-router's `useMatch` requires unique paths.
  const activeTab: TabKey = location.pathname.endsWith('/pages') ? 'pages' : 'name'

  const seriesTitle = chapter?.title ?? t('publication.header.workbenchLabel')

  return (
    <header className='flex shrink-0 flex-col border-b border-border bg-card'>
      <div className='flex h-16 items-center justify-between px-4 md:px-6'>
        {/* Left: brand + chapter context */}
        <div className='flex min-w-0 items-center gap-3'>
          <div className='flex shrink-0 items-center gap-2'>
            <BrandLogo className='h-9 w-9 rounded-lg' />
            <div className='flex flex-col leading-tight'>
              <span className='text-sm font-bold tracking-wide text-primary'>{SITE.shortName}</span>
              <span className='text-[10px] uppercase tracking-widest text-muted-foreground'>
                {t('publication.header.brandSubtitle')}
              </span>
            </div>
          </div>
          <div className='hidden h-8 w-px shrink-0 bg-border sm:block' />
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold'>
              {t('publication.header.chapterContext', {
                series: seriesTitle,
                n: chapter?.chapterNumber ?? '—'
              })}
            </p>
            <p className='truncate text-xs text-muted-foreground'>
              {chapter?.title || t('publication.header.workbenchLabel')}
            </p>
          </div>
        </div>

        {/* Right: back link + theme + language */}
        <div className='flex items-center gap-3'>
          <PublicationStatusPill />
          <Link
            to={backHref}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted'
            )}
          >
            <ArrowLeft className='h-3.5 w-3.5' />
            <span className='hidden sm:inline'>{t('publication.header.backToSeries')}</span>
          </Link>
          <div className='hidden h-6 w-px bg-border sm:block' />
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>

      {/* Tabs row */}
      <div className='flex h-12 items-center gap-2 border-t border-border bg-background/40 px-4 md:px-6'>
        <nav className='flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm' role='tablist'>
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            const className = cn(
              'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : tab.enabled
                  ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  : 'cursor-not-allowed text-muted-foreground/50 hover:bg-transparent'
            )
            if (tab.enabled) {
              return (
                <Link key={tab.key} to={tab.href} role='tab' aria-selected={isActive} className={className}>
                  <Icon className='h-3.5 w-3.5' />
                  <span>{t(tab.i18n)}</span>
                </Link>
              )
            }
            return (
              <span
                key={tab.key}
                role='tab'
                aria-disabled='true'
                aria-selected={false}
                title={t('publication.header.tabPagesDisabledHint')}
                className={className}
              >
                <Icon className='h-3.5 w-3.5' />
                <span>{t(tab.i18n)}</span>
              </span>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

// Suppress unused-import warning in some bundlers; keep the helper re-exported
// for sibling components that may import through this module path.
export { isMissingRecordError }
