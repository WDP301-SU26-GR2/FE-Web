import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageOff, Loader2 } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

import { PublicationHeader } from './publication-header'
import { NameSection } from './components/name-section'
import { PagesSection } from './components/pages-section'
import { useChapter } from './hooks/use-chapter'
import { useChapterName } from './hooks/use-chapter-name'
import { useChapterPages } from './hooks/use-chapter-pages'

export type PublicationWorkbenchProps = {
  seriesId: string
  chapterId: string
}

/**
 * Page-level component for the Publication Workbench.
 *
 * - Fetches the chapter + its Name + its pages in parallel.
 * - Renders a focused two-section layout (Name section + Pages section).
 * - Owns the chapter cache via `useChapter` so the SSR-loader and any
 *   follow-up `refresh()` stay in sync.
 */
export function PublicationWorkbench({ seriesId, chapterId }: PublicationWorkbenchProps) {
  const { t } = useTranslation('mangaka')
  const {
    chapter,
    isLoading: chapterLoading,
    error: chapterError,
    notFound,
    refresh: refreshChapter
  } = useChapter(chapterId)
  const { name, refresh: refreshName } = useChapterName(chapterId)
  const { pages, isLoading: pagesLoading, refresh: refreshPages } = useChapterPages(chapterId)

  // Refresh chapter once after a Name action — refetch is driven by hooks
  // independently via their own state, so this also syncs chapter metadata
  // (e.g. chapter.status changing after page uploads).
  useEffect(() => {
    // No-op: we just want the dependency array to make the linter happy.
  }, [chapterId])

  if (notFound) {
    return <NotFoundView backHref={`/dashboard/mangaka/series/${seriesId}`} />
  }

  if (!chapter && chapterLoading) {
    return <LoadingScreen />
  }

  if (!chapter && chapterError) {
    return (
      <ErrorScreen
        backHref={`/dashboard/mangaka/series/${seriesId}`}
        message={extractApiErrorMessage({ message: chapterError }, t('publication.error.generic'))}
        onRetry={() => {
          refreshChapter()
          refreshName()
          refreshPages()
        }}
      />
    )
  }

  if (!chapter) return null

  const seriesTitle = chapter.title ?? t('publication.header.workbenchLabel')

  // Trigger a one-shot chapter refresh after any side-effect so the gating
  // logic in `PagesSection` (which depends on `name.status === 'APPROVED'`)
  // stays accurate without manual cascading.
  const onAnyChange = () => {
    refreshChapter()
    refreshName()
    refreshPages()
  }

  return (
    <div className='flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground transition-colors duration-300'>
      <PublicationHeader
        seriesTitle={seriesTitle}
        chapterNumber={chapter.chapterNumber}
        chapterTitle={chapter.title}
        backHref={`/dashboard/mangaka/series/${seriesId}`}
      />
      <main className='flex-1 overflow-y-auto bg-background/50 p-6 md:p-8'>
        <div className='mx-auto flex max-w-6xl flex-col gap-6'>
          <div className='flex flex-wrap items-baseline justify-between gap-3'>
            <div>
              <h1 className='text-2xl font-bold tracking-tight'>
                {t('publication.workbenchTitle', { n: chapter.chapterNumber })}
              </h1>
              <p className='mt-1 text-sm text-muted-foreground'>{t('publication.workbenchSubtitle')}</p>
            </div>
          </div>
          <NameSection chapter={chapter} name={name} isLoading={!name && chapterLoading} onRefresh={onAnyChange} />
          <PagesSection chapter={chapter} pages={pages} name={name} isLoading={pagesLoading} onRefresh={onAnyChange} />
        </div>
      </main>
    </div>
  )
}

function LoadingScreen() {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex h-screen items-center justify-center bg-background text-muted-foreground'>
      <div className='flex flex-col items-center gap-3'>
        <Loader2 className='h-8 w-8 animate-spin' />
        <p className='text-sm'>{t('publication.loading')}</p>
      </div>
    </div>
  )
}

function NotFoundView({ backHref }: { backHref: string }) {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex h-screen items-center justify-center bg-background p-6 text-foreground'>
      <div className='flex max-w-md flex-col items-center gap-3 text-center'>
        <ImageOff className='h-12 w-12 text-muted-foreground/40' />
        <h2 className='text-lg font-semibold'>{t('publication.notFound.title')}</h2>
        <p className='text-sm text-muted-foreground'>{t('publication.notFound.description')}</p>
        <a
          href={backHref}
          className={cn(
            'mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90'
          )}
        >
          {t('publication.notFound.back')}
        </a>
      </div>
    </div>
  )
}

function ErrorScreen({ backHref, message, onRetry }: { backHref: string; message: string; onRetry: () => void }) {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex h-screen items-center justify-center bg-background p-6 text-foreground'>
      <div className='mx-auto flex max-w-md flex-col items-center gap-3 text-center'>
        <div
          role='alert'
          className='w-full rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive'
        >
          {message}
        </div>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={onRetry}
            className='rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-muted cursor-pointer'
          >
            {t('publication.error.retry')}
          </button>
          <a
            href={backHref}
            className={cn(
              'rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90'
            )}
          >
            {t('publication.notFound.back')}
          </a>
        </div>
      </div>
    </div>
  )
}
