import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronUp, ImageIcon, Loader2, MessageSquareText, Plus, Sparkles, Upload } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import type { PageListResDtoOutputItemsItem } from '~/api/model/chapters'
import type { AnnotationResDtoOutput } from '~/api/model/annotations'

import { usePublicationContext } from './publication-shell-context'
import { PageStatusBadge } from './lib/name-status-meta'
import { SignedImage } from '~/shared/components/signed-image'
import { useCreatePage } from './hooks/use-create-page'
import { usePageAnnotations } from './hooks/use-page-annotations'
import { uploadToR2WithMessage } from '~/shared/lib/upload/upload-to-r2'
import { ManuscriptActionPanel } from './components/manuscript-action-panel'

/**
 * Pages view — 3-column composite reader.
 *
 * Layout (desktop ≥ lg):
 *   [ LEFT 200px ]  [ CENTER flex-1 ]  [ RIGHT 320px ]
 *     TOC list       Page stack            Editor notes / annotations
 *   page-thumbs      separated by gaps     feedback per selected page
 *
 * On smaller screens the side rails collapse into a single-column stack
 * (TOC first, page stack, then notes) to avoid crushing the page image.
 *
 * Behaviour:
 *   - Renders only when Name.status === 'APPROVED' (gate handled by the
 *     shell via the locked empty state in `PublicationPagesView`).
 *   - Each page is identified by `pageNumber`. We use IntersectionObserver
 *     to keep the TOC "selected" item in sync as the user scrolls.
 *   - "Add page" button opens an inline composer to upload the next page
 *     (pageNumber = max + 1). The composer uploads to R2 then calls
 *     `POST /chapters/:id/pages` with the resulting object key.
 *
 * Notes shown on the right rail are derived from per-page annotations
 * (`targetType='PAGE'`) which come from Editor reviews during EDITOR_REVIEW
 * (§5 of FE-API-Guide-v3).
 */
export function PublicationPagesReaderView() {
  const { t } = useTranslation('mangaka')
  const { chapter, name, pages, refreshAll } = usePublicationContext()

  // The page that's currently in-view on the centre stack.
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)

  const sortedPages = useMemo(() => [...pages].sort((a, b) => a.pageNumber - b.pageNumber), [pages])

  // Keep "active" page in sync with scroll position via IntersectionObserver.
  const stackRef = useRef<HTMLDivElement | null>(null)
  const pageRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

  const setPageRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) pageRefs.current.set(id, el)
      else pageRefs.current.delete(id)
    },
    []
  )

  // Initialise observer and keep "active" page in sync as user scrolls.
  useEffect(() => {
    if (sortedPages.length === 0) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the visible entry with the highest intersection ratio.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) {
          const id = (visible[0].target as HTMLElement).dataset.pageId
          if (id) setActivePageId(id)
        }
      },
      {
        root: stackRef.current,
        threshold: [0, 0.25, 0.5, 0.75, 1],
        // Bias selection toward the top of the viewport so the rail updates
        // as soon as a page enters the visible window.
        rootMargin: '-20% 0px -40% 0px'
      }
    )

    pageRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [sortedPages])

  // Default the active page to the first one when the list is fresh. We've
  // restructured to derive via `useMemo` + render-time assign to avoid a
  // synchronous setState inside an effect.
  const effectiveActivePageId = useMemo(() => {
    if (activePageId) return activePageId
    return sortedPages[0]?.id ?? null
  }, [activePageId, sortedPages])

  const jumpToPage = useCallback((pageId: string) => {
    const el = pageRefs.current.get(pageId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  if (!chapter || !name) return null

  const canMutateProduction =
    !chapter.hold &&
    chapter.manuscriptStatus !== null &&
    ['DRAFT', 'IN_PRODUCTION', 'EDITOR_REVISION'].includes(chapter.manuscriptStatus)

  const nextPageNumber = sortedPages.length === 0 ? 1 : Math.max(...sortedPages.map((p) => p.pageNumber)) + 1

  return (
    <div className='mx-auto flex max-w-[1400px] flex-col gap-4 p-4 md:p-6 lg:flex-row'>
      {/* LEFT: page TOC */}
      <aside className='lg:w-56 lg:shrink-0'>
        <div className='sticky top-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
          <header className='border-b border-border px-4 py-3'>
            <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
              {t('publication.pagesReader.toc.title')}
            </h2>
            <p className='mt-0.5 text-xs text-muted-foreground/80'>
              {t('publication.pagesReader.toc.count', { n: sortedPages.length })}
            </p>
          </header>
          <ol className='max-h-[calc(100vh-220px)] overflow-y-auto p-2'>
            {sortedPages.length === 0 ? (
              <li className='px-3 py-6 text-center text-xs text-muted-foreground'>
                {t('publication.pagesReader.toc.empty')}
              </li>
            ) : (
              sortedPages.map((p) => (
                <li key={p.id}>
                  <button
                    type='button'
                    onClick={() => jumpToPage(p.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors cursor-pointer',
                      effectiveActivePageId === p.id ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold',
                        effectiveActivePageId === p.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {p.pageNumber}
                    </span>
                    <span className='min-w-0 flex-1 truncate'>
                      {t('publication.pagesReader.toc.pageLabel', { n: p.pageNumber })}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ol>
          <footer className='border-t border-border p-2'>
            <button
              type='button'
              onClick={() => setComposerOpen(true)}
              disabled={!canMutateProduction}
              className='flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <Plus className='h-3.5 w-3.5' />
              {t('publication.pagesReader.addPage')}
            </button>
          </footer>
        </div>
      </aside>

      {/* CENTER: page stack */}
      <main className='flex-1 min-w-0'>
        <header className='mb-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3'>
            <div>
              <p className='text-[11px] font-bold uppercase tracking-widest text-muted-foreground'>
                {t('publication.pagesReader.compositeLabel')}
              </p>
              <h1 className='mt-1 text-lg font-bold tracking-tight'>
                {t('publication.pagesReader.title', {
                  chapterTitle: chapter.title || t('publication.header.workbenchLabel'),
                  n: chapter.chapterNumber
                })}
              </h1>
            </div>
          </div>
          <p className='px-5 py-3 text-xs text-muted-foreground'>{t('publication.pagesReader.subtitle')}</p>
          <ManuscriptActionPanel />
        </header>

        {sortedPages.length === 0 ? (
          <div className='flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground'>
              <ImageIcon className='h-5 w-5' />
            </div>
            <h2 className='text-base font-semibold'>{t('publication.pagesReader.emptyTitle')}</h2>
            <p className='max-w-md text-sm text-muted-foreground'>{t('publication.pagesReader.emptyDesc')}</p>
          </div>
        ) : (
          <div
            ref={stackRef}
            className='flex max-h-[calc(100vh-220px)] flex-col gap-6 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-sm'
          >
            {sortedPages.map((p) => (
              <PageCard
                key={p.id}
                page={p}
                setRef={setPageRef(p.id)}
                readOnly={!canMutateProduction}
              />
            ))}
            <button
              type='button'
              onClick={() => {
                const first = pageRefs.current.entries().next().value
                if (first) (first[1] as HTMLDivElement | undefined)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className='mx-auto flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted cursor-pointer'
            >
              <ChevronUp className='h-3.5 w-3.5' />
              {t('publication.pagesReader.backToTop')}
            </button>
          </div>
        )}

        {composerOpen && canMutateProduction && (
          <PageComposer
            chapterId={chapter.id}
            nextPageNumber={nextPageNumber}
            onCancel={() => setComposerOpen(false)}
            onUploaded={() => {
              setComposerOpen(false)
              refreshAll()
            }}
          />
        )}
      </main>

      {/* RIGHT: notes rail */}
      <aside className='lg:w-80 lg:shrink-0'>
        <NotesRail pageId={effectiveActivePageId} />
      </aside>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page card                                                                 */
/* -------------------------------------------------------------------------- */

function PageCard({
  page,
  setRef,
  readOnly
}: {
  page: PageListResDtoOutputItemsItem
  setRef: (el: HTMLDivElement | null) => void
  readOnly: boolean
}) {
  const { t } = useTranslation('mangaka')

  // For the reader, the "composite" file (if any) is the canonical artwork to
  // show. We fall back to `originalFile` when no composite exists yet.
  // Per FE-API-Guide §5, both file fields are R2 object keys.
  const showKey = page.compositeFile ?? page.originalFile
  const isComposite = !!page.compositeFile

  return (
    <div ref={setRef} data-page-id={page.id} className='flex flex-col gap-3 scroll-mt-24'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <span className='flex h-7 min-w-7 items-center justify-center rounded-md bg-primary/10 px-2 text-xs font-bold text-primary'>
            {page.pageNumber}
          </span>
          <PageStatusBadge status={page.status} />
          {isComposite ? (
            <span className='inline-flex items-center gap-1 rounded-full border border-info/20 bg-info/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-info'>
              <Sparkles className='h-3 w-3' />
              {t('publication.pagesReader.compositeBadge')}
            </span>
          ) : null}
        </div>
        {readOnly && <span className='text-[11px] font-medium text-muted-foreground'>{t('publication.pagesReader.done')}</span>}
      </div>

      <SignedImage r2Key={showKey} alt={`page-${page.pageNumber}`} aspectClassName='aspect-[3/4]' className='w-full' />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Inline upload composer                                                    */
/* -------------------------------------------------------------------------- */

function PageComposer({
  chapterId,
  nextPageNumber,
  onCancel,
  onUploaded
}: {
  chapterId: string
  nextPageNumber: number
  onCancel: () => void
  onUploaded: () => void
}) {
  const { t } = useTranslation('mangaka')
  const { createPage, isCreating } = useCreatePage()
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const submit = async () => {
    if (!file) return
    setIsUploading(true)
    try {
      const uploaded = await uploadToR2WithMessage(file, t('publication.pagesReader.uploadError'))
      if (!uploaded || !uploaded.key) {
        return
      }
      const success = await createPage({
        chapterId,
        pageNumber: nextPageNumber,
        originalFile: uploaded.key
      })
      if (success) {
        onUploaded()
      }
    } finally {
      setIsUploading(false)
    }
  }

  const busy = isCreating || isUploading

  return (
    <div className='mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <header className='flex items-center justify-between border-b border-border px-5 py-3'>
        <h3 className='text-sm font-bold'>{t('publication.pagesReader.composer.title', { n: nextPageNumber })}</h3>
        <button
          type='button'
          onClick={onCancel}
          className='text-xs text-muted-foreground hover:text-foreground cursor-pointer'
        >
          {t('publication.pagesReader.composer.cancel')}
        </button>
      </header>
      <div className='flex flex-col gap-3 p-5'>
        <label className='flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-xs text-muted-foreground'>
          <Upload className='h-5 w-5' />
          <span>{file ? file.name : t('publication.pagesReader.composer.dropOrClick')}</span>
          <input
            type='file'
            accept='image/png,image/jpeg,image/webp,application/pdf'
            className='hidden'
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          type='button'
          disabled={busy || !file}
          onClick={() => void submit()}
          className='flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer'
        >
          {busy && <Loader2 className='h-4 w-4 animate-spin' />}
          {t('publication.pagesReader.composer.submit', { n: nextPageNumber })}
        </button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Notes rail                                                                */
/* -------------------------------------------------------------------------- */

function NotesRail({ pageId }: { pageId: string | null }) {
  const { t } = useTranslation('mangaka')
  const { annotations, isLoading } = usePageAnnotations(pageId ?? null)

  return (
    <div className='sticky top-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <header className='border-b border-border px-4 py-3'>
        <h2 className='flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground'>
          <MessageSquareText className='h-3.5 w-3.5' />
          {t('publication.pagesReader.notes.title')}
        </h2>
        <p className='mt-0.5 text-xs text-muted-foreground/80'>
          {pageId ? t('publication.pagesReader.notes.forPage') : t('publication.pagesReader.notes.noSelection')}
        </p>
      </header>
      <div className='max-h-[calc(100vh-260px)] overflow-y-auto p-3'>
        {!pageId ? (
          <p className='px-3 py-6 text-center text-xs text-muted-foreground'>
            {t('publication.pagesReader.notes.empty')}
          </p>
        ) : isLoading && annotations.length === 0 ? (
          <div className='flex justify-center py-6 text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
          </div>
        ) : annotations.length === 0 ? (
          <p className='px-3 py-6 text-center text-xs text-muted-foreground'>
            {t('publication.pagesReader.notes.noNotes')}
          </p>
        ) : (
          <ul className='flex flex-col gap-3'>
            {annotations.map((note) => (
              <AnnotationNoteCard key={note.id} note={note} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function AnnotationNoteCard({ note }: { note: AnnotationResDtoOutput }) {
  const { t } = useTranslation('mangaka')
  return (
    <li
      className={cn(
        'rounded-lg border px-3 py-2.5',
        note.isResolved ? 'border-border bg-muted/40 opacity-70' : 'border-info/30 bg-info/5'
      )}
    >
      <div className='mb-1 flex items-center justify-between gap-2'>
        <span className='inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
          {t(`publication.pagesReader.notes.role.${(note.authorRole ?? 'EDITOR').toUpperCase()}`)}
        </span>
        {note.isResolved ? (
          <span className='text-[10px] font-semibold text-success'>{t('publication.pagesReader.notes.resolved')}</span>
        ) : null}
      </div>
      <p className='text-sm text-foreground'>{note.content ?? '—'}</p>
      <p className='mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/80'>{note.annotationType}</p>
    </li>
  )
}
