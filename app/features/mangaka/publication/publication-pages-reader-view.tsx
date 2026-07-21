import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  Check,
  ChevronUp,
  ImageIcon,
  Loader2,
  MessageSquareText,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X
} from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import type { PageListResDtoOutputItemsItem, UpdatePageBodyDto } from '~/api/model/chapters'
import type { AnnotationResDtoOutput } from '~/api/model/annotations'

import { usePublicationContext } from './publication-shell-context'
import { PageStatusBadge } from './lib/name-status-meta'
import { SignedImage } from '~/shared/components/signed-image'
import { useCreatePage } from './hooks/use-create-page'
import { useDeletePage } from './hooks/use-delete-page'
import { useDeletePagesBulk } from './hooks/use-delete-pages-bulk'
import { useUpdatePage } from './hooks/use-update-page'
import { usePageAnnotations } from './hooks/use-page-annotations'
import { uploadToR2WithMessage } from '~/shared/lib/upload/upload-to-r2'
import { ManuscriptActionPanel } from './components/manuscript-action-panel'
import { Dialog } from '~/shared/ui/dialog'
import { useUpdatePage } from './hooks/use-update-page'
import { useDeletePage } from './hooks/use-delete-page'
import { taskControllerListTasks } from '~/api/operations/task/task'

/**
 * Pages view — composite reader for Mangaka.
 *
 * Layout (desktop ≥ lg):
 *   [ LEFT 200px ]  [ CENTER flex-1 ]  [ RIGHT 320px ]
 *     TOC list       Page stack            Editor notes / annotations
 *   page-thumbs      separated by gaps     feedback per selected page
 *
 * On smaller screens the side rails collapse into a single-column stack
 * (TOC first, page stack, then notes) to avoid crushing the page image.
 *
 * Behaviour per FE-API-Guide-v3 §5 + §6:
 *   - Renders only when Name.status === 'APPROVED' (gate handled by the
 *     shell via the locked empty state in `PublicationPagesView`).
 *   - Each page is identified by `pageNumber`. We use IntersectionObserver
 *     to keep the TOC "selected" item in sync as the user scrolls.
 *   - `originalFile` is uploaded by Mangaka (raw pencil/ink scan).
 *   - `compositeFile` is produced by Assistant Task approval — FE NEVER
 *     uploads compositeFile manually. It's read-only from the Task flow.
 *   - Mangaka uploads `originalFile` via "Add page" button → `POST /chapters/:id/pages`.
 *   - After Name APPROVED, Mangaka creates Regions → assigns Tasks → Assistant
 *     submits → Mangaka approves → BE writes `compositeFile` to the Page.
 *   - Submit manuscript: BE checks that every non-CANCELLED Task is APPROVED.
 *
 * Delete / Update per FE-API-Guide-v3 §5 (2026-07-21):
 *   - `DELETE /pages/:pageId` — delete single page (cascade Region + Task).
 *   - `DELETE /chapters/:id/pages` with `{pageIds}` — bulk delete (all-or-nothing, max 50).
 *   - `PATCH /pages/:pageId` — update `pageNumber` (only; `originalFile` immutable).
 *   - Pages must be `DRAFT`/`REVISING` to edit/delete. `COMPLETED` pages are locked.
 *
 * Notes shown on the right rail are derived from per-page annotations
 * (`targetType='PAGE'`) which come from Editor reviews during EDITOR_REVIEW
 * (§5 of FE-API-Guide-v3).
 */
export function PublicationPagesReaderView() {
  const { t } = useTranslation('mangaka')
  const { chapter, name, pages, refreshAll } = usePublicationContext()

  // All hooks at top level — never inside callbacks or conditionals.
  const { createPage, isCreating } = useCreatePage()
  const { deletePage, isDeleting } = useDeletePage()
  const { deletePagesBulk, isDeletingBulk } = useDeletePagesBulk()
  const { updatePage, isUpdating } = useUpdatePage()

  // The page that's currently in-view on the centre stack.
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)

  // Bulk selection mode for deleting multiple pages.
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set())

  // Confirm dialog state.
  const [deleteConfirmPage, setDeleteConfirmPage] = useState<PageListResDtoOutputItemsItem | null>(null)
  const [deleteBulkConfirm, setDeleteBulkConfirm] = useState(false)
  const [updatePageTarget, setUpdatePageTarget] = useState<PageListResDtoOutputItemsItem | null>(null)

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
        rootMargin: '-20% 0px -40% 0px'
      }
    )

    pageRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [sortedPages])

  // Default the active page to the first one when the list is fresh.
  const effectiveActivePageId = useMemo(() => {
    if (activePageId) return activePageId
    return sortedPages[0]?.id ?? null
  }, [activePageId, sortedPages])

  const jumpToPage = useCallback((pageId: string) => {
    const el = pageRefs.current.get(pageId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Bulk selection helpers.
  const togglePageSelection = useCallback((pageId: string) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev)
      if (next.has(pageId)) next.delete(pageId)
      else next.add(pageId)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedPageIds(new Set(sortedPages.map((p) => p.id)))
  }, [sortedPages])

  const deselectAll = useCallback(() => {
    setSelectedPageIds(new Set())
  }, [])

  const exitBulkMode = useCallback(() => {
    setBulkMode(false)
    setSelectedPageIds(new Set())
    setDeleteBulkConfirm(false)
  }, [])

  const isPageEditable = useCallback((page: PageListResDtoOutputItemsItem) => {
    return page.status === 'DRAFT' || page.status === 'REVISING'
  }, [])

  if (!chapter || !name) return null

  // Actions that call API hooks.
  const handleDeletePage = useCallback(
    async (pageId: string) => {
      await deletePage(pageId)
      setDeleteConfirmPage(null)
      refreshPages()
    },
    [deletePage, refreshPages]
  )

  const handleDeleteBulk = useCallback(async () => {
    await deletePagesBulk(chapter.id, Array.from(selectedPageIds))
    exitBulkMode()
    refreshPages()
  }, [deletePagesBulk, chapter.id, selectedPageIds, exitBulkMode, refreshPages])

  const handleUpdatePage = useCallback(
    async (pageId: string, input: { pageNumber: number; compositeFile: string | null }) => {
      const body: UpdatePageBodyDto = { pageNumber: input.pageNumber }
      if (input.compositeFile) {
        body.compositeFile = input.compositeFile
      }
      const result = await updatePage({ pageId, body })
      if (result) {
        setUpdatePageTarget(null)
        refreshPages()
      }
    },
    [updatePage, refreshPages]
  )

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
                    {bulkMode && (
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-colors',
                          selectedPageIds.has(p.id)
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-transparent'
                        )}
                        aria-hidden='true'
                      >
                        {selectedPageIds.has(p.id) && <Check className='h-3 w-3' />}
                      </span>
                    )}
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
            {bulkMode ? (
              <div className='flex flex-col gap-1'>
                <p className='px-1 py-0.5 text-[10px] text-muted-foreground'>
                  {t('publication.pagesReader.deleteBulk.selectedCount', { count: selectedPageIds.size })}
                </p>
                <button
                  type='button'
                  onClick={selectAll}
                  disabled={selectedPageIds.size === sortedPages.length}
                  className='flex w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-border bg-card px-2 py-1.5 text-[10px] font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {t('publication.pagesReader.deleteBulk.selectAll')}
                </button>
                <button
                  type='button'
                  onClick={deselectAll}
                  disabled={selectedPageIds.size === 0}
                  className='flex w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-border bg-card px-2 py-1.5 text-[10px] font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {t('publication.pagesReader.deleteBulk.deselectAll')}
                </button>
                <button
                  type='button'
                  onClick={exitBulkMode}
                  className='flex w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-border bg-card px-2 py-1.5 text-[10px] font-medium hover:bg-muted'
                >
                  {t('publication.pagesReader.delete.cancellingButton')}
                </button>
              </div>
            ) : (
              <button
                type='button'
                onClick={() => setComposerOpen(true)}
                disabled={!!chapter.hold || chapter.manuscriptStatus === null}
                className='flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <Plus className='h-3.5 w-3.5' />
                {t('publication.pagesReader.addPage')}
              </button>
            )}
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
            <div className='flex items-center gap-2'>
              {!bulkMode && sortedPages.length > 0 && (
                <button
                  type='button'
                  onClick={() => setBulkMode(true)}
                  disabled={!!chapter.hold || chapter.manuscriptStatus === null}
                  className='flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
                >
                  <Trash2 className='h-3.5 w-3.5' />
                  {t('publication.pagesReader.deleteBulk.enterSelectMode')}
                </button>
              )}
              {bulkMode && selectedPageIds.size > 0 && (
                <button
                  type='button'
                  onClick={() => setDeleteBulkConfirm(true)}
                  disabled={!!chapter.hold || isDeletingBulk}
                  className='flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
                >
                  <Trash2 className='h-3.5 w-3.5' />
                  {t('publication.pagesReader.deleteBulk.confirmButton', { count: selectedPageIds.size })}
                </button>
              )}
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
                bulkMode={bulkMode}
                selected={selectedPageIds.has(p.id)}
                onToggleSelect={() => togglePageSelection(p.id)}
                onDelete={() => setDeleteConfirmPage(p)}
                onUpdatePage={() => setUpdatePageTarget(p)}
                isEditable={isPageEditable(p)}
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

        {composerOpen && chapter.manuscriptStatus !== null && !chapter.hold && (
          <PageComposerModal
            chapterId={chapter.id}
            createPage={createPage}
            isCreating={isCreating}
            nextPageNumber={
              sortedPages.length === 0 ? 1 : Math.max(...sortedPages.map((p) => p.pageNumber)) + 1
            }
            onCancel={() => setComposerOpen(false)}
            onUploaded={() => {
              setComposerOpen(false)
              refreshAll()
            }}
          />
        )}

        {deleteConfirmPage && (
          <DeletePageConfirmDialog
            page={deleteConfirmPage}
            isDeleting={isDeleting}
            onConfirm={() => handleDeletePage(deleteConfirmPage.id)}
            onCancel={() => setDeleteConfirmPage(null)}
          />
        )}

        {deleteBulkConfirm && (
          <DeleteBulkConfirmDialog
            count={selectedPageIds.size}
            isDeleting={isDeletingBulk}
            onConfirm={handleDeleteBulk}
            onCancel={() => setDeleteBulkConfirm(false)}
          />
        )}

        {updatePageTarget && (
          <UpdatePageDialog
            page={updatePageTarget}
            takenPageNumbers={sortedPages.map((p) => p.pageNumber)}
            isUpdating={isUpdating}
            onConfirm={(input) => handleUpdatePage(updatePageTarget.id, input)}
            onCancel={() => setUpdatePageTarget(null)}
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
  bulkMode,
  selected,
  onToggleSelect,
  onDelete,
  onUpdatePage,
  isEditable
}: {
  page: PageListResDtoOutputItemsItem
  setRef: (el: HTMLDivElement | null) => void
  bulkMode: boolean
  selected: boolean
  onToggleSelect: () => void
  onDelete: () => void
  onUpdatePage: () => void
  isEditable: boolean
}) {
  const { t } = useTranslation('mangaka')

  return (
    <div ref={setRef} data-page-id={page.id} className='flex flex-col gap-3 scroll-mt-24'>
      <div className='flex items-center gap-2'>
        {bulkMode ? (
          <button
            type='button'
            onClick={onToggleSelect}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded border-2 text-xs font-bold transition-colors cursor-pointer',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-transparent hover:border-primary/50'
            )}
            aria-label={
              selected
                ? t('publication.pagesReader.deleteBulk.deselectAll')
                : t('publication.pagesReader.deleteBulk.selectAll')
            }
          >
            {selected && <Check className='h-4 w-4' />}
          </button>
        ) : (
          <span className='flex h-7 min-w-7 items-center justify-center rounded-md bg-primary/10 px-2 text-xs font-bold text-primary'>
            {page.pageNumber}
          </span>
        )}
        <PageStatusBadge status={page.status} />
        {!bulkMode && isEditable && (
          <div className='ml-auto flex items-center gap-1'>
            <button
              type='button'
              onClick={onUpdatePage}
              aria-label={t('publication.pagesReader.updatePage.dialogTitle')}
              className='flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'
            >
              <Pencil className='h-3.5 w-3.5' />
            </button>
            <button
              type='button'
              onClick={onDelete}
              aria-label={t('publication.pagesReader.delete.confirmButton')}
              className='flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
            >
              <Trash2 className='h-3.5 w-3.5' />
            </button>
          </div>
        )}
      </div>

      <SignedImage
        r2Key={page.displayFile ?? page.originalFile}
        alt={`page-${page.pageNumber}`}
        aspectClassName='aspect-[3/4]'
        className='w-full'
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Upload composer (modal)                                                   */
/* -------------------------------------------------------------------------- */

function PageComposerModal({
  chapterId,
  createPage,
  isCreating,
  nextPageNumber,
  onCancel,
  onUploaded
}: {
  chapterId: string
  createPage: (input: { chapterId: string; pageNumber: number; originalFile: string }) => Promise<unknown>
  isCreating: boolean
  nextPageNumber: number
  onCancel: () => void
  onUploaded: () => void
}) {
  const { t } = useTranslation('mangaka')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

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

  const modal = (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-labelledby='page-composer-title'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className='flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl outline-none'
      >
        <header className='flex shrink-0 items-center justify-between border-b border-border px-5 py-3'>
          <h3 id='page-composer-title' className='text-sm font-bold'>
            {t('publication.pagesReader.composer.title', { n: nextPageNumber })}
          </h3>
          <button
            type='button'
            onClick={onCancel}
            aria-label={t('publication.pagesReader.composer.cancel')}
            className='flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'
          >
            <X className='h-4 w-4' />
          </button>
        </header>
        <div className='flex min-h-0 flex-col gap-3 overflow-y-auto p-5'>
          {previewUrl && file?.type.startsWith('image/') ? (
            <div className='flex flex-col items-center gap-2'>
              <img
                src={previewUrl}
                alt={file.name}
                className='max-h-64 w-auto rounded-md border border-border object-contain'
              />
              <p className='truncate text-xs text-muted-foreground'>{file.name}</p>
            </div>
          ) : (
            <label className='flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-xs text-muted-foreground hover:bg-muted/40'>
              <Upload className='h-5 w-5' />
              <span className='font-medium text-foreground'>{t('publication.pagesReader.composer.dropOrClick')}</span>
              <span className='text-[10px] uppercase tracking-widest'>
                {t('publication.pagesReader.composer.allowedTypes')}
              </span>
              <input
                type='file'
                accept='image/png,image/jpeg,image/webp,application/pdf'
                className='hidden'
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
          {file && (
            <button
              type='button'
              onClick={() => setFile(null)}
              className='self-center cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline'
            >
              {t('publication.pagesReader.composer.chooseAnother')}
            </button>
          )}
        </div>
        <footer className='flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3'>
          <button
            type='button'
            onClick={onCancel}
            disabled={busy}
            className='cursor-pointer rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
          >
            {t('publication.pagesReader.composer.cancel')}
          </button>
          <button
            type='button'
            disabled={busy || !file}
            onClick={() => void submit()}
            className='flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer'
          >
            {busy && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
            {t('publication.pagesReader.composer.submit', { n: nextPageNumber })}
          </button>
        </footer>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}

/* -------------------------------------------------------------------------- */
/*  Delete page confirm dialog                                                */
/* -------------------------------------------------------------------------- */

function DeletePageConfirmDialog({
  page,
  isDeleting,
  onConfirm,
  onCancel
}: {
  page: PageListResDtoOutputItemsItem
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation('mangaka')
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    dialogRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  const modal = (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-labelledby='delete-page-title'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className='flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl outline-none'
      >
        <header className='flex shrink-0 items-center justify-between border-b border-border px-5 py-3'>
          <h3 id='delete-page-title' className='text-sm font-bold'>
            {t('publication.pagesReader.delete.confirmTitle', { n: page.pageNumber })}
          </h3>
          <button
            type='button'
            onClick={onCancel}
            className='flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'
          >
            <X className='h-4 w-4' />
          </button>
        </header>
        <div className='p-5'>
          <p className='text-sm text-muted-foreground'>{t('publication.pagesReader.delete.confirmDesc')}</p>
        </div>
        <footer className='flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3'>
          <button
            type='button'
            onClick={onCancel}
            disabled={isDeleting}
            className='cursor-pointer rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
          >
            {t('publication.pagesReader.delete.cancellingButton')}
          </button>
          <button
            type='button'
            onClick={onConfirm}
            disabled={isDeleting}
            className='flex items-center justify-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
          >
            {isDeleting && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
            {t('publication.pagesReader.delete.confirmButton')}
          </button>
        </footer>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}

/* -------------------------------------------------------------------------- */
/*  Delete bulk pages confirm dialog                                          */
/* -------------------------------------------------------------------------- */

function DeleteBulkConfirmDialog({
  count,
  isDeleting,
  onConfirm,
  onCancel
}: {
  count: number
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation('mangaka')
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    dialogRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  const modal = (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-labelledby='delete-bulk-title'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className='flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl outline-none'
      >
        <header className='flex shrink-0 items-center justify-between border-b border-border px-5 py-3'>
          <h3 id='delete-bulk-title' className='text-sm font-bold'>
            {t('publication.pagesReader.deleteBulk.confirmTitle', { count })}
          </h3>
          <button
            type='button'
            onClick={onCancel}
            className='flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'
          >
            <X className='h-4 w-4' />
          </button>
        </header>
        <div className='p-5'>
          <p className='text-sm text-muted-foreground'>{t('publication.pagesReader.deleteBulk.confirmDesc')}</p>
        </div>
        <footer className='flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3'>
          <button
            type='button'
            onClick={onCancel}
            disabled={isDeleting}
            className='cursor-pointer rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
          >
            {t('publication.pagesReader.delete.cancellingButton')}
          </button>
          <button
            type='button'
            onClick={onConfirm}
            disabled={isDeleting}
            className='flex items-center justify-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
          >
            {isDeleting && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
            {t('publication.pagesReader.deleteBulk.confirmButton', { count })}
          </button>
        </footer>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}

/* -------------------------------------------------------------------------- */
/*  Update page dialog (number + composite image)                               */
/* -------------------------------------------------------------------------- */

function UpdatePageDialog({
  page,
  takenPageNumbers,
  isUpdating,
  onConfirm,
  onCancel
}: {
  page: PageListResDtoOutputItemsItem
  takenPageNumbers: number[]
  isUpdating: boolean
  onConfirm: (input: { pageNumber: number; compositeFile: string | null }) => void
  onCancel: () => void
}) {
  const { t } = useTranslation('mangaka')
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const [inputValue, setInputValue] = useState(String(page.pageNumber))
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    dialogRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const isValidPageNumber = (() => {
    const n = parseInt(inputValue, 10)
    if (isNaN(n) || n < 1) return false
    if (n === page.pageNumber) return true
    return !takenPageNumbers.includes(n)
  })()

  const hasChanges = () => {
    const n = parseInt(inputValue, 10)
    const pageNumberChanged = n !== page.pageNumber
    const hasNewFile = file !== null
    return pageNumberChanged || hasNewFile
  }

  const handleSubmit = async () => {
    const n = parseInt(inputValue, 10)
    if (isNaN(n) || n < 1) return

    let compositeFile: string | null = null

    if (file) {
      setIsUploading(true)
      try {
        const uploaded = await uploadToR2WithMessage(file, t('publication.error.generic'))
        if (!uploaded || !uploaded.key) return
        compositeFile = uploaded.key
      } finally {
        setIsUploading(false)
      }
    }

    onConfirm({ pageNumber: n, compositeFile })
  }

  const busy = isUpdating || isUploading

  const modal = (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-labelledby='update-page-title'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className='flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl outline-none'
      >
        <header className='flex shrink-0 items-center justify-between border-b border-border px-5 py-3'>
          <h3 id='update-page-title' className='text-sm font-bold'>
            {t('publication.pagesReader.updatePage.dialogTitle')}
          </h3>
          <button
            type='button'
            onClick={onCancel}
            className='flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'
          >
            <X className='h-4 w-4' />
          </button>
        </header>
        <div className='flex flex-col gap-4 p-5'>
          <div className='flex items-center gap-3'>
            <label className='w-24 text-xs text-muted-foreground'>
              {t('publication.pagesReader.updatePageNumber.currentLabel')}
            </label>
            <span className='text-sm font-semibold'>{page.pageNumber}</span>
          </div>
          <div className='flex items-center gap-3'>
            <label className='w-24 text-xs text-muted-foreground' htmlFor='new-page-number'>
              {t('publication.pagesReader.updatePageNumber.newLabel')}
            </label>
            <input
              id='new-page-number'
              type='number'
              min={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className='flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring'
            />
          </div>
          {!isValidPageNumber && inputValue !== String(page.pageNumber) && (
            <p className='text-xs text-destructive'>
              {takenPageNumbers.includes(parseInt(inputValue, 10))
                ? t('publication.pagesReader.updatePageNumber.errorDuplicate')
                : t('publication.pagesReader.updatePageNumber.errorGeneric')}
            </p>
          )}

          <div className='border-t border-border pt-4'>
            <label className='mb-2 block text-xs font-medium text-muted-foreground'>
              {t('publication.pagesReader.updatePage.imageLabel')}
            </label>
            {previewUrl ? (
              <div className='flex flex-col items-center gap-2'>
                <img src={previewUrl} alt='preview' className='max-h-32 rounded-md border border-border object-contain' />
                <button
                  type='button'
                  onClick={() => setFile(null)}
                  className='cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline'
                >
                  {t('publication.pagesReader.composer.chooseAnother')}
                </button>
              </div>
            ) : (
              <label className='flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-4 text-xs text-muted-foreground hover:bg-muted/40'>
                <Upload className='h-5 w-5' />
                <span className='font-medium text-foreground'>{t('publication.pagesReader.composer.dropOrClick')}</span>
                <span className='text-[10px] uppercase tracking-widest'>
                  {t('publication.pagesReader.composer.allowedTypes')}
                </span>
                <input
                  type='file'
                  accept='image/png,image/jpeg,image/webp'
                  className='hidden'
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>
        </div>
        <footer className='flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3'>
          <button
            type='button'
            onClick={onCancel}
            disabled={busy}
            className='cursor-pointer rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
          >
            {t('publication.pagesReader.updatePageNumber.cancel')}
          </button>
          <button
            type='button'
            onClick={() => void handleSubmit()}
            disabled={!isValidPageNumber || !hasChanges() || busy}
            className='flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
          >
            {busy && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
            {t('publication.pagesReader.updatePage.confirm')}
          </button>
        </footer>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modal, document.body)
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
