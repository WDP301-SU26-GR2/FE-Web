import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ImageOff, Loader2, Pencil, Upload } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import type { PageListResDtoOutputItemsItem } from '~/api/model/chapters'
import type { NameListResDtoOutputItemsItem } from '~/api/model/names'

import { PageStatusBadge } from '../lib/name-status-meta'
import { SignedImage } from '~/shared/components/signed-image'
import { UploadPageDialog } from './upload-page-dialog'
import { ImageLightbox } from '~/features/mangaka/series/components/image-lightbox'
import { useCreatePage } from '../hooks/use-create-page'
import { useUpdatePage } from '../hooks/use-update-page'

export type PagesSectionProps = {
  chapterId: string
  pages: PageListResDtoOutputItemsItem[]
  name: NameListResDtoOutputItemsItem | null
  isLoading: boolean
  onRefresh: () => void
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  NOT_STARTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPOSITE_READY', 'COMPLETED'],
  COMPOSITE_READY: ['COMPLETED'],
  COMPLETED: []
}

/**
 * Pages (production) section of the publication workbench.
 *
 * - Locked when the chapter's Name is not yet APPROVED (BE 409
 *   `Error.ChapterNameNotApproved`).
 * - Per page: thumb + pageNumber + status badge + manual status transition
 *   (for the rare case Mangaka wants to bypass the cascade).
 * - Upload button is the primary CTA, gated by Name approval.
 */
export function PagesSection({ chapterId, pages, name, isLoading, onRefresh }: PagesSectionProps) {
  const { t } = useTranslation('mangaka')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ key: string; alt: string } | null>(null)
  const [transitioningId, setTransitioningId] = useState<string | null>(null)

  const { createPage, isCreating } = useCreatePage()
  const { updatePage, isUpdating } = useUpdatePage()

  const nameStatus = name?.status ?? null
  const isGated = nameStatus !== 'APPROVED'

  const startingPageNumber = pages.length === 0 ? 1 : Math.max(...pages.map((p) => p.pageNumber)) + 1

  const onUploadConfirm = async (input: { pageNumber: number; originalFile: string }) => {
    const created = await createPage({
      chapterId,
      pageNumber: input.pageNumber,
      originalFile: input.originalFile
    })
    if (!created) return false
    onRefresh()
    setUploadOpen(false)
    return true
  }

  const onTransition = async (page: PageListResDtoOutputItemsItem, next: string) => {
    setTransitioningId(page.id)
    try {
      const updated = await updatePage({
        pageId: page.id,
        body: { status: next as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPOSITE_READY' | 'COMPLETED' }
      })
      if (updated) onRefresh()
    } finally {
      setTransitioningId(null)
    }
  }

  return (
    <section className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <header className='flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3'>
        <div className='flex items-center gap-2'>
          <Upload className='h-4 w-4 text-muted-foreground' />
          <h2 className='text-sm font-bold uppercase tracking-wider'>{t('publication.pagesSection.title')}</h2>
          <span className='text-xs text-muted-foreground'>
            {t('publication.pagesSection.count', { count: pages.length })}
          </span>
        </div>
        <button
          type='button'
          onClick={() => setUploadOpen(true)}
          disabled={isGated}
          title={isGated ? t('publication.pagesSection.gatedDesc') : undefined}
          className='flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
        >
          <Upload className='h-3.5 w-3.5' />
          {t('publication.pagesSection.uploadButton')}
        </button>
      </header>

      <div className='space-y-3 p-5'>
        {isGated && (
          <div className='flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700'>
            <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
            <div>
              <p className='font-semibold'>{t('publication.pagesSection.gatedTitle')}</p>
              <p className='text-amber-700/80'>{t('publication.pagesSection.gatedDesc')}</p>
            </div>
          </div>
        )}

        {isLoading && pages.length === 0 ? (
          <div className='flex flex-col items-center gap-2 py-10 text-muted-foreground'>
            <Loader2 className='h-6 w-6 animate-spin' />
            <p className='text-xs'>{t('publication.loading')}</p>
          </div>
        ) : pages.length === 0 ? (
          <div className='flex flex-col items-center gap-2 py-10 text-center text-muted-foreground'>
            <ImageOff className='h-8 w-8 text-muted-foreground/40' />
            <p className='text-sm'>{t('publication.pagesSection.empty')}</p>
          </div>
        ) : (
          <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
            {pages.map((page) => {
              const nextStates = STATUS_TRANSITIONS[page.status] ?? []
              return (
                <li
                  key={page.id}
                  className='space-y-1.5 rounded-lg border border-border bg-card p-2 transition-all hover:shadow-sm'
                >
                  <button
                    type='button'
                    onClick={() =>
                      page.originalFile &&
                      setLightbox({ key: page.originalFile, alt: t('publication.pagesSection.pageAlt', { n: page.pageNumber }) })
                    }
                    disabled={!page.originalFile}
                    className='block w-full cursor-pointer rounded-md disabled:cursor-default'
                  >
                    {page.originalFile ? (
                      <SignedImage
                        r2Key={page.originalFile}
                        alt={t('publication.pagesSection.pageAlt', { n: page.pageNumber })}
                        aspectClassName='aspect-[3/4]'
                        className='w-full'
                      />
                    ) : (
                      <div className='flex aspect-[3/4] w-full items-center justify-center rounded-md bg-muted/40 text-muted-foreground/60'>
                        <ImageOff className='h-4 w-4' />
                      </div>
                    )}
                  </button>
                  <div className='flex flex-wrap items-center justify-between gap-1.5 px-1'>
                    <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                      {t('publication.pagesSection.card.page', { n: page.pageNumber })}
                    </span>
                    <PageStatusBadge status={page.status} />
                  </div>
                  {nextStates.length > 0 && (
                    <div className={cn('flex flex-wrap gap-1 px-1')}>
                      {nextStates.map((next) => (
                        <button
                          key={next}
                          type='button'
                          onClick={() => void onTransition(page, next)}
                          disabled={transitioningId === page.id || isUpdating}
                          className='flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60'
                        >
                          {transitioningId === page.id ? (
                            <Loader2 className='h-3 w-3 animate-spin' />
                          ) : (
                            <Pencil className='h-3 w-3' />
                          )}
                          {t(`publication.pageStatus.${next}`)}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <UploadPageDialog
        open={uploadOpen}
        chapterId={chapterId}
        startingPageNumber={startingPageNumber}
        isSubmitting={isCreating}
        onConfirm={onUploadConfirm}
        onCancel={() => setUploadOpen(false)}
      />
      {lightbox && (
        <ImageLightbox
          r2Key={lightbox.key}
          alt={lightbox.alt}
          open={!!lightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
  )
}
