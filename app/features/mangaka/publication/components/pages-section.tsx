import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, ImageOff, Loader2, Pencil, RefreshCw, Send, Upload } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import type { ChapterListResDtoOutputItemsItem, PageListResDtoOutputItemsItem } from '~/api/model/chapters'
import type { NameListResDtoOutputItemsItem } from '~/api/model/names'

import { PageStatusBadge } from '../lib/name-status-meta'
import { SignedImage } from '~/shared/components/signed-image'
import { UploadPageDialog } from './upload-page-dialog'
import { ImageLightbox } from '~/features/mangaka/series/components/image-lightbox'
import { useCreatePage } from '../hooks/use-create-page'
import { useUpdatePage } from '../hooks/use-update-page'
import { useManuscriptActions, type ManuscriptAction } from '../hooks/use-publication-transitions'
import { ReplaceCompositeDialog } from './replace-composite-dialog'

export type PagesSectionProps = {
  chapter: ChapterListResDtoOutputItemsItem
  pages: PageListResDtoOutputItemsItem[]
  name: NameListResDtoOutputItemsItem | null
  isLoading: boolean
  onRefresh: () => void
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  NOT_STARTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPOSITE_READY'],
  COMPOSITE_READY: ['COMPLETED', 'IN_PROGRESS'],
  COMPLETED: []
}

/**
 * Pages (production) section of the publication workbench.
 *
 * - Upload is available only after Name approval and while the manuscript
 *   remains editable; every mutation is disabled while the chapter is held.
 * - Per page: thumb + pageNumber + status badge + manual status transition
 *   (for the rare case Mangaka wants to bypass the cascade).
 * - Manuscript actions follow IN_PRODUCTION -> COMPOSITE_REVIEW ->
 *   EDITOR_REVIEW and EDITOR_REVISION -> EDITOR_REVIEW.
 */
export function PagesSection({ chapter, pages, name, isLoading, onRefresh }: PagesSectionProps) {
  const { t } = useTranslation('mangaka')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ key: string; alt: string } | null>(null)
  const [transitioningId, setTransitioningId] = useState<string | null>(null)
  const [replacingPage, setReplacingPage] = useState<PageListResDtoOutputItemsItem | null>(null)

  const { createPage, isCreating } = useCreatePage()
  const { updatePage, isUpdating } = useUpdatePage()
  const { runAction, pendingAction } = useManuscriptActions()

  const chapterId = chapter.id
  const nameStatus = name?.status ?? null
  const manuscriptStatus = chapter.manuscriptStatus ?? 'DRAFT'
  const isOnHold = chapter.hold !== null && chapter.hold !== undefined
  const canUpload =
    nameStatus === 'APPROVED' && !isOnHold && ['DRAFT', 'IN_PRODUCTION', 'EDITOR_REVISION'].includes(manuscriptStatus)
  const canEditPages = !isOnHold && ['IN_PRODUCTION', 'COMPOSITE_REVIEW', 'EDITOR_REVISION'].includes(manuscriptStatus)
  const isGated = !canUpload
  const allPagesCompleted = pages.length > 0 && pages.every((page) => page.status === 'COMPLETED')

  const manuscriptAction: ManuscriptAction | null =
    manuscriptStatus === 'IN_PRODUCTION'
      ? 'mark-composite-ready'
      : manuscriptStatus === 'COMPOSITE_REVIEW'
        ? 'submit'
        : manuscriptStatus === 'EDITOR_REVISION'
          ? 'resubmit'
          : null

  const actionLabel =
    manuscriptAction === 'mark-composite-ready'
      ? t('publication.manuscript.actions.mark-composite-ready.label', { defaultValue: 'Chốt bản tổng hợp' })
      : manuscriptAction === 'submit'
        ? t('publication.manuscript.actions.submit.label', { defaultValue: 'Nộp cho Editor' })
        : t('publication.manuscript.actions.resubmit.label', { defaultValue: 'Nộp lại cho Editor' })

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

  const onManuscriptAction = async () => {
    if (!manuscriptAction) return
    const updated = await runAction(chapterId, manuscriptAction)
    if (updated) onRefresh()
  }

  const onReplaceComposite = async (compositeFile: string) => {
    if (!replacingPage) return false
    const updated = await updatePage({ pageId: replacingPage.id, body: { compositeFile } })
    if (!updated) return false
    setReplacingPage(null)
    onRefresh()
    return true
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
          disabled={!canUpload}
          title={!canUpload ? t('publication.pagesSection.gatedDesc') : undefined}
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
              <p className='font-semibold'>
                {isOnHold
                  ? t('publication.pagesSection.onHoldTitle', { defaultValue: 'Chương đang tạm giữ' })
                  : nameStatus !== 'APPROVED'
                    ? t('publication.pagesSection.gatedTitle')
                    : t('publication.pagesSection.lockedTitle', { defaultValue: 'Bản thảo đang được duyệt' })}
              </p>
              <p className='text-amber-700/80'>
                {isOnHold
                  ? t('publication.pagesSection.onHoldDesc', { defaultValue: 'Tiếp tục chương trước khi chỉnh sửa.' })
                  : nameStatus !== 'APPROVED'
                    ? t('publication.pagesSection.gatedDesc')
                    : t('publication.pagesSection.lockedDesc', {
                        defaultValue: 'Không thể tải thêm trang ở trạng thái bản thảo hiện tại.'
                      })}
              </p>
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
              const displayFile = page.compositeFile ?? page.originalFile
              return (
                <li
                  key={page.id}
                  className='space-y-1.5 rounded-lg border border-border bg-card p-2 transition-all hover:shadow-sm'
                >
                  <button
                    type='button'
                    onClick={() =>
                      displayFile &&
                      setLightbox({
                        key: displayFile,
                        alt: t('publication.pagesSection.pageAlt', { n: page.pageNumber })
                      })
                    }
                    disabled={!displayFile}
                    className='block w-full cursor-pointer rounded-md disabled:cursor-default'
                  >
                    {displayFile ? (
                      <SignedImage
                        r2Key={displayFile}
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
                  {nextStates.length > 0 && canEditPages && (
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
                  {manuscriptStatus === 'EDITOR_REVISION' && (
                    <button
                      type='button'
                      onClick={() => setReplacingPage(page)}
                      disabled={isUpdating || isOnHold}
                      className='mx-1 flex items-center gap-1 rounded border border-orange-500/30 bg-orange-500/10 px-1.5 py-1 text-[10px] font-semibold text-orange-700 transition-colors hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      <RefreshCw className='h-3 w-3' />
                      {t('publication.pagesSection.replaceComposite.button', { defaultValue: 'Thay bản composite' })}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {manuscriptAction && (
          <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3'>
            <div>
              <p className='text-sm font-semibold'>
                {t('publication.manuscript.title', { defaultValue: 'Tiến trình bản thảo' })}
              </p>
              <p className='text-xs text-muted-foreground'>
                {manuscriptAction === 'submit' && !allPagesCompleted
                  ? t('publication.manuscript.completePagesFirst', {
                      defaultValue: 'Hoàn tất tất cả trang trước khi nộp cho Editor.'
                    })
                  : t('publication.manuscript.currentStatus', {
                      status: manuscriptStatus,
                      defaultValue: `Trạng thái hiện tại: ${manuscriptStatus}`
                    })}
              </p>
            </div>
            <button
              type='button'
              onClick={() => void onManuscriptAction()}
              disabled={isOnHold || pendingAction !== null || (manuscriptAction === 'submit' && !allPagesCompleted)}
              className='flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {pendingAction === manuscriptAction ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : manuscriptAction === 'mark-composite-ready' ? (
                <CheckCircle2 className='h-3.5 w-3.5' />
              ) : (
                <Send className='h-3.5 w-3.5' />
              )}
              {actionLabel}
            </button>
          </div>
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
      <ReplaceCompositeDialog
        open={replacingPage !== null}
        pageNumber={replacingPage?.pageNumber ?? 0}
        isSubmitting={isUpdating}
        onConfirm={onReplaceComposite}
        onCancel={() => {
          if (!isUpdating) setReplacingPage(null)
        }}
      />
      {lightbox && (
        <ImageLightbox r2Key={lightbox.key} alt={lightbox.alt} open={!!lightbox} onClose={() => setLightbox(null)} />
      )}
    </section>
  )
}
