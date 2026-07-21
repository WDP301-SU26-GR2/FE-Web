import { useMemo } from 'react'
import { Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'

import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

import { PublicationContext } from './publication-shell-context'
import { usePublicationData } from './hooks/use-publication-data'
import { PublicationShellHeader } from './components/publication-shell-header'
import {
  LoadingScreen,
  NotFoundView,
  ErrorScreen
} from '~/shared/components/publication-fallbacks'

/**
 * Layout shell for the publication workbench.
 *
 * Owns the chapter/name/pages fetch lifecycle (so the Name view and the Page
 * view can share data via `usePublicationContext()` instead of re-fetching).
 * Also renders the workbench header with the Name/Page segmented toggle that
 * swaps between the two child routes:
 *
 *   /publish/:seriesId/:chapterId           → redirects to "name" (default)
 *   /publish/:seriesId/:chapterId/name     → storyboard Name editor
 *   /publish/:seriesId/:chapterId/pages    → composite page reader
 */
export function PublicationShell({ params }: { params: { seriesId: string; chapterId: string } }) {
  const { t } = useTranslation('mangaka')
  const { seriesId, chapterId } = params
  const data = usePublicationData(chapterId)

  // Default back-link targets the series-level chapters list. Adjust if a
  // future release wants to navigate to the series detail page directly.
  const backHref = useMemo(() => `/dashboard/mangaka/series/${seriesId}`, [seriesId])

  const ctx = useMemo(
    () => ({
      seriesId,
      chapterId,
      chapter: data.chapter,
      chapterLoading: data.chapterLoading,
      chapterError: data.chapterError,
      chapterNotFound: data.chapterNotFound,
      name: data.name,
      nameLoading: data.nameLoading,
      pages: data.pages,
      pagesLoading: data.pagesLoading,
      pagesError: data.pagesError,
      refreshChapter: data.refreshChapter,
      refreshName: data.refreshName,
      refreshPages: data.refreshPages,
      refreshAll: data.refreshAll,
      backHref
    }),
    [
      seriesId,
      chapterId,
      data.chapter,
      data.chapterLoading,
      data.chapterError,
      data.chapterNotFound,
      data.name,
      data.nameLoading,
      data.pages,
      data.pagesLoading,
      data.pagesError,
      data.refreshChapter,
      data.refreshName,
      data.refreshPages,
      data.refreshAll,
      backHref
    ]
  )

  // Top-level fallback states — children handle the empty / gated cases.
  if (data.chapterNotFound) {
    return <NotFoundView backHref={backHref} />
  }
  if (data.chapterLoading && !data.chapter) {
    return <LoadingScreen />
  }
  if (data.chapterError && !data.chapter) {
    return (
      <ErrorScreen
        backHref={backHref}
        message={extractApiErrorMessage({ message: data.chapterError }, t('publication.error.generic'))}
        onRetry={data.refreshChapter}
      />
    )
  }
  if (!data.chapter) {
    return <LoadingScreen />
  }

  return (
    <PublicationContext.Provider value={ctx}>
      <div className='flex min-h-screen flex-col bg-background text-foreground'>
        <PublicationShellHeader />
        <main className='flex-1'>
          <Outlet />
        </main>
      </div>
    </PublicationContext.Provider>
  )
}
