import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'

import { usePublicationContext } from './publication-shell-context'
import { PublicationPagesReaderView } from './publication-pages-reader-view'

/**
 * Pages view. Enforces the API gate (Name.status === 'APPROVED') BEFORE
 * mounting the heavy reader — keeps the "locked" UX crisp and avoids the
 * reader fetching annotations / pages when there's nothing meaningful to
 * render.
 *
 * When approved, mounts the 3-column reader implemented in
 * `publication-pages-reader-view.tsx`.
 */
export function PublicationPagesView() {
  const { t } = useTranslation('mangaka')
  const { seriesId, chapterId, name } = usePublicationContext()
  const isUnlocked = name?.status === 'APPROVED'

  if (!isUnlocked) {
    return (
      <section className='mx-auto flex max-w-3xl flex-col items-center gap-4 p-12 text-center md:p-16'>
        <div className='flex h-14 w-14 items-center justify-center rounded-full border border-warning/30 bg-warning/10 text-warning'>
          <Lock className='h-6 w-6' />
        </div>
        <h2 className='text-xl font-bold tracking-tight'>{t('publication.pagesLocked.title')}</h2>
        <p className='max-w-md text-sm text-muted-foreground'>{t('publication.pagesLocked.description')}</p>
        <Link
          to={`/publish/${seriesId}/${chapterId}/name`}
          className='inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90'
        >
          {t('publication.pagesLocked.backToName')}
        </Link>
      </section>
    )
  }

  return <PublicationPagesReaderView />
}
