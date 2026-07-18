import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookPlus, Loader2, Pencil, Send } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import type { ChapterListResDtoOutputItemsItem } from '~/api/model/chapters'
import type { NameListResDtoOutputItemsItem } from '~/api/model/names'

import { NameStatusBadge, NAME_EDITABLE_STATUSES } from '../lib/name-status-meta'
import { NamePageCard } from './name-page-card'
import { CreateNameDialog } from './create-name-dialog'
import { EditNameDialog } from './edit-name-dialog'
import { ImageLightbox } from '~/features/mangaka/series/components/image-lightbox'
import { useCreateName } from '../hooks/use-create-name'
import { useUpdateNamePages } from '../hooks/use-update-name-pages'
import { useResubmitName } from '../hooks/use-resubmit-name'
import { useSubmitChapterName } from '../hooks/use-publication-transitions'

export type NameSectionProps = {
  chapter: ChapterListResDtoOutputItemsItem | null
  name: NameListResDtoOutputItemsItem | null
  isLoading: boolean
  /** Refresh trigger callable after a successful mutation. */
  onRefresh: () => void
}

/**
 * Name (storyboard) section of the publication workbench.
 *
 * Actions:
 *   - Create Name — when no Name exists + chapter is DRAFT (multi-file upload).
 *   - Edit pages — when Name is DRAFT or REVISION: open the granular editor
 *     (remove existing pages, append new uploads, save with one PUT).
 *   - Resubmit — when Name is REVISION (Mangaka only).
 *
 * Approval / request-revision / submission-state transitions are owned by
 * the Editor on their workbench — we deliberately do not surface them here.
 *
 * NOTE: We do NOT expose a "Delete Name" action anymore. The previous
 * "delete + recreate" loop is bất cập — if Mangaka got the first upload
 * slightly wrong they had to throw the entire storyboard away. The
 * granular Edit flow handles removal of individual existing pages, so
 * there is no longer any reason to wipe the whole record.
 */
export function NameSection({ chapter, name, isLoading, onRefresh }: NameSectionProps) {
  const { t } = useTranslation('mangaka')

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ key: string; alt: string } | null>(null)

  const { createName, isCreating } = useCreateName()
  const { updatePages, isUpdating } = useUpdateNamePages()
  const { resubmit, isResubmitting } = useResubmitName()
  const { submitName, isSubmittingName } = useSubmitChapterName()

  const chapterId = chapter?.id ?? ''
  const nameId = name?.id ?? ''
  const status = name?.status ?? null

  const canCreate = !name && chapterId && chapter?.status === 'DRAFT'
  const canEdit = !!name && NAME_EDITABLE_STATUSES.includes(status as (typeof NAME_EDITABLE_STATUSES)[number])
  const canSubmit = !!name && status === 'DRAFT' && name.pages.length > 0
  const canResubmit = !!name && status === 'REVISION'

  const onCreateConfirm = async (pages: { pageNumber: number; fileUrl: string }[]) => {
    if (!chapterId) return false
    const created = await createName({ chapterId, pages })
    if (!created) return false
    onRefresh()
    setCreateOpen(false)
    return true
  }

  const onEditConfirm = async (pages: { pageNumber: number; fileUrl: string }[]) => {
    if (!chapterId || !nameId) return false
    const updated = await updatePages({ chapterId, nameId, pages })
    if (!updated) return false
    onRefresh()
    setEditOpen(false)
    return true
  }

  const onResubmit = async () => {
    if (!chapterId || !nameId) return
    const next = await resubmit({ chapterId, nameId })
    if (next) onRefresh()
  }

  const onSubmit = async () => {
    if (!chapterId || !nameId) return
    const next = await submitName({ chapterId, nameId })
    if (next) onRefresh()
  }

  return (
    <section className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <header className='flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <BookPlus className='h-4 w-4 text-muted-foreground' />
          <h2 className='text-sm font-bold uppercase tracking-wider'>{t('publication.nameSection.title')}</h2>
          {name && <NameStatusBadge status={name.status} className='ml-1' />}
          {name && (
            <span className='text-xs text-muted-foreground'>
              {t('publication.nameSection.versionLabel', { n: name.version })}
            </span>
          )}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {canCreate && (
            <button
              type='button'
              onClick={() => setCreateOpen(true)}
              className='flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 cursor-pointer'
            >
              <BookPlus className='h-3.5 w-3.5' />
              {t('publication.nameSection.createButton')}
            </button>
          )}
          {canEdit && (
            <button
              type='button'
              onClick={() => setEditOpen(true)}
              className='flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-muted cursor-pointer'
            >
              <Pencil className='h-3.5 w-3.5' />
              {t('publication.nameSection.editButton')}
            </button>
          )}
          {canResubmit && (
            <button
              type='button'
              onClick={() => void onResubmit()}
              disabled={isResubmitting}
              className='flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer'
            >
              {isResubmitting ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Send className='h-3.5 w-3.5' />}
              {t('publication.nameSection.resubmitButton')}
            </button>
          )}
          {canSubmit && (
            <button
              type='button'
              onClick={() => void onSubmit()}
              disabled={isSubmittingName}
              className='flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {isSubmittingName ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Send className='h-3.5 w-3.5' />}
              {t('publication.nameSection.submitButton', { defaultValue: 'Nộp Name' })}
            </button>
          )}
        </div>
      </header>

      <div className='space-y-3 p-5'>
        {isLoading && !name ? (
          <div className='flex flex-col items-center gap-2 py-10 text-muted-foreground'>
            <Loader2 className='h-6 w-6 animate-spin' />
            <p className='text-xs'>{t('publication.loading')}</p>
          </div>
        ) : !name ? (
          <div className='flex flex-col items-center gap-2 py-10 text-center text-muted-foreground'>
            <p className='text-sm'>{t('publication.nameSection.empty')}</p>
            {canCreate && <p className='text-xs text-muted-foreground/80'>{t('publication.nameSection.emptyHint')}</p>}
          </div>
        ) : name.pages.length === 0 ? (
          <div className='flex flex-col items-center gap-2 py-10 text-center text-muted-foreground'>
            <p className='text-sm'>{t('publication.nameSection.noPages')}</p>
          </div>
        ) : (
          <ul className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5')}>
            {name.pages.map((pg, idx) => (
              <li key={`${pg.pageNumber}-${idx}`}>
                <NamePageCard
                  pageNumber={pg.pageNumber}
                  fileUrl={pg.fileUrl}
                  alt={t('publication.nameSection.pageAlt', { n: pg.pageNumber })}
                  onClick={() =>
                    setLightbox({
                      key: pg.fileUrl,
                      alt: t('publication.nameSection.pageAlt', { n: pg.pageNumber })
                    })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateNameDialog
        open={createOpen}
        chapterId={chapterId}
        isSubmitting={isCreating}
        onConfirm={onCreateConfirm}
        onCancel={() => setCreateOpen(false)}
        startingPageNumber={1}
      />
      <EditNameDialog
        open={editOpen}
        chapterId={chapterId}
        isSubmitting={isUpdating}
        existingPages={name?.pages.map((p) => ({ pageNumber: p.pageNumber, fileUrl: p.fileUrl })) ?? []}
        onConfirm={onEditConfirm}
        onCancel={() => setEditOpen(false)}
      />
      {lightbox && (
        <ImageLightbox r2Key={lightbox.key} alt={lightbox.alt} open={!!lightbox} onClose={() => setLightbox(null)} />
      )}
    </section>
  )
}
