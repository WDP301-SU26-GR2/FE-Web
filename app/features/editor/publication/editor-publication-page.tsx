import { Link } from 'react-router'
import { BookCheck, CalendarClock, Eye, Printer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { EditorPublicationData } from '../types'

const ACTIVE_STATUSES = new Set(['EDITOR_REVIEW', 'READY_FOR_PRINT', 'AWAITING_CO_OWNER_APPROVAL'])

export function EditorPublicationPage({ data, hasError }: { data: EditorPublicationData | null; hasError: boolean }) {
  const { t } = useTranslation('editor')
  const chapters = data?.chapters ?? []
  return (
    <div className='space-y-6 pb-12'>
      <header>
        <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Printer className='size-4' />
          {t('publication.eyebrow')}
        </div>
        <h1 className='mt-2 text-2xl font-bold text-foreground md:text-3xl'>{t('publication.title')}</h1>
        <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground'>{t('publication.subtitle')}</p>
      </header>
      {hasError && (
        <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
          {t('errors.loadDescription')}
        </div>
      )}
      <ChapterSection
        title={t('publication.awaiting')}
        items={chapters.filter(({ chapter }) =>
          Boolean(chapter.manuscriptStatus && ACTIVE_STATUSES.has(chapter.manuscriptStatus))
        )}
        empty={t('publication.emptyAwaiting')}
      />
      <ChapterSection
        title={t('publication.history')}
        items={chapters.filter(({ chapter }) => chapter.manuscriptStatus === 'PUBLISHED')}
        empty={t('publication.emptyHistory')}
      />
    </div>
  )
}

function ChapterSection({
  title,
  items,
  empty
}: {
  title: string
  items: EditorPublicationData['chapters']
  empty: string
}) {
  const { t, i18n } = useTranslation('editor')
  return (
    <section className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-bold text-foreground'>{title}</h2>
        <span className='rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground'>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className='rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground'>
          {empty}
        </div>
      ) : (
        <div className='divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
          {items.map(({ series, chapter }) => (
            <article
              key={chapter.id}
              className='flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between'
            >
              <div className='flex items-start gap-3'>
                <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                  <BookCheck className='size-5' />
                </div>
                <div>
                  <p className='text-xs font-bold text-primary'>{series.title}</p>
                  <h3 className='mt-1 font-bold text-foreground'>
                    {t('publication.chapter', { number: chapter.chapterNumber })}
                    {chapter.title ? ` · ${chapter.title}` : ''}
                  </h3>
                  <div className='mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
                    <span className='rounded-full bg-muted px-2.5 py-1 font-bold'>
                      {(chapter.manuscriptStatus ?? chapter.status).replaceAll('_', ' ')}
                    </span>
                    {chapter.schedule?.currentDeadline && (
                      <span className='inline-flex items-center gap-1'>
                        <CalendarClock className='size-3.5' />
                        {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
                          new Date(chapter.schedule.currentDeadline)
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Link
                to={`/dashboard/editor/publication/${series.id}/${chapter.id}`}
                className='inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
              >
                <Eye className='size-4' />
                {t('actions.review')}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
