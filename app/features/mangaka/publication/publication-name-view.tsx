import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookPlus, CalendarClock, CheckCircle2, Clock, FileCheck2, Loader2, Pencil, Send, Trash2 } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import type { NameListResDtoOutputItemsItem } from '~/api/model/names'

import { usePublicationContext } from './publication-shell-context'
import { NamePageCard } from './components/name-page-card'
import { NameStatusBadge } from './lib/name-status-meta'
import { CreateNameDialog } from './components/create-name-dialog'
import { EditNameDialog } from './components/edit-name-dialog'
import { ImageLightbox } from '~/features/mangaka/series/components/image-lightbox'
import { useCreateName } from './hooks/use-create-name'
import { useUpdateNamePages } from './hooks/use-update-name-pages'
import { useResubmitName } from './hooks/use-resubmit-name'
import { useNameActions } from './hooks/use-name-actions'
import { NAME_EDITABLE_STATUSES, type NameStatusKey } from './lib/name-status-meta'

/**
 * Name (storyboard) view for the publication workbench.
 *
 * The view is rendered inside `<PublicationShell>`, which already owns the
 * chapter fetch. We additionally drive mutation hooks locally and call
 * `refreshAll()` on success so the chapter metadata (e.g. chapter.status after
 * approval) stays accurate without manual cascading.
 *
 * Layout intent: mimic a "document review" experience — a header strip with
 * chapter context + version + status + deadline, then a thumbnail grid that
 * reads like flipping through storyboard pages.
 */
export function PublicationNameView() {
  const { t } = useTranslation('mangaka')
  const { chapter, name, refreshAll } = usePublicationContext()

  // Local UI state — modal open flags + lightbox. Kept co-located here
  // because no other view needs it.
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ key: string; alt: string } | null>(null)

  // Reuse the legacy action hooks (already wire to the BE).
  const { createName, isCreating } = useCreateName()
  const { updatePages, isUpdating } = useUpdateNamePages()
  const { resubmit, isResubmitting } = useResubmitName()
  const { submit, remove, activeAction } = useNameActions()

  if (!chapter) return null

  const chapterId = chapter.id
  const nameId = name?.id ?? ''
  const status = (name?.status ?? null) as NameStatusKey | null

  // Action gates — see `name-status-meta.tsx` for state-machine explanation.
  const canCreate = !name && chapter.status === 'DRAFT'
  const canEdit = !!name && status !== null && NAME_EDITABLE_STATUSES.includes(status)
  const canSubmit = !!name && status === 'DRAFT'
  const canResubmit = !!name && status === 'REVISION'
  const canRemove = !!name && chapter.status === 'DRAFT' && status !== 'APPROVED'

  // Mutation success handlers — refresh everything (chapter + name + pages)
  // because approving the Name un-gates page uploads which most callers will
  // want to follow up on (see Pages view).
  const onCreateConfirm = async (pages: { pageNumber: number; fileUrl: string }[]) => {
    if (!chapterId) return false
    const created = await createName({ chapterId, pages })
    if (!created) return false
    refreshAll()
    setCreateOpen(false)
    return true
  }

  const onEditConfirm = async (pages: { pageNumber: number; fileUrl: string }[]) => {
    if (!chapterId || !nameId) return false
    const updated = await updatePages({ chapterId, nameId, pages })
    if (!updated) return false
    refreshAll()
    setEditOpen(false)
    return true
  }

  const onResubmit = async () => {
    if (!chapterId || !nameId) return
    const next = await resubmit({ chapterId, nameId })
    if (next) refreshAll()
  }

  const onSubmit = async () => {
    if (!chapterId || !nameId) return
    const next = await submit({ chapterId, nameId })
    if (next) refreshAll()
  }

  const onRemove = async () => {
    if (!chapterId || !nameId) return
    if (!window.confirm(t('publication.nameSection.remove.confirm'))) return
    const removed = await remove({ chapterId, nameId })
    if (removed) refreshAll()
  }

  return (
    <section className='mx-auto flex max-w-6xl flex-col gap-6 p-6 md:p-8'>
      <DocumentHeader
        name={name}
        chapter={chapter}
        onCreate={() => setCreateOpen(true)}
        onEdit={() => setEditOpen(true)}
        onSubmit={onSubmit}
        onResubmit={onResubmit}
        onRemove={onRemove}
        activeAction={activeAction}
        isResubmitting={isResubmitting}
        canCreate={canCreate}
        canEdit={canEdit}
        canSubmit={canSubmit}
        canResubmit={canResubmit}
        canRemove={canRemove}
      />

      {name && name.pages.length > 0 ? (
        <PageGrid
          name={name}
          onOpen={(item) => setLightbox({ key: item.fileUrl, alt: `name-page-${item.pageNumber}` })}
        />
      ) : (
        <EmptyName hasName={!!name} canCreate={canCreate} />
      )}

      <NameStatusExplainer status={status} />

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

type DocumentHeaderProps = {
  name: NameListResDtoOutputItemsItem | null
  chapter: NonNullable<ReturnType<typeof usePublicationContext>['chapter']>
  canCreate: boolean
  canEdit: boolean
  canSubmit: boolean
  canResubmit: boolean
  canRemove: boolean
  onCreate: () => void
  onEdit: () => void
  onSubmit: () => Promise<void>
  onResubmit: () => Promise<void>
  onRemove: () => Promise<void>
  activeAction: 'submit' | 'remove' | null
  isResubmitting: boolean
}

/**
 * Header strip modelled like a "document under review" — version + status +
 * deadline on one line, action buttons on the right.
 */
function DocumentHeader({
  name,
  chapter,
  canCreate,
  canEdit,
  canSubmit,
  canResubmit,
  canRemove,
  onCreate,
  onEdit,
  onSubmit,
  onResubmit,
  onRemove,
  activeAction,
  isResubmitting
}: DocumentHeaderProps) {
  const { t } = useTranslation('mangaka')
  const deadline = chapter.schedule?.currentDeadline
  const submittedAt = name?.submittedAt

  return (
    <div className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      {/* Title bar */}
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4'>
        <div className='min-w-0'>
          <p className='text-[11px] font-bold uppercase tracking-widest text-muted-foreground'>
            {t('publication.name.documentLabel')}
          </p>
          <h1 className='mt-1 text-xl font-bold tracking-tight'>
            {t('publication.name.titleWithChapter', {
              chapterTitle: chapter.title || t('publication.header.workbenchLabel'),
              n: chapter.chapterNumber
            })}
          </h1>
          <p className='mt-1 text-xs text-muted-foreground'>{t('publication.name.subtitle')}</p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {canCreate && (
            <button
              type='button'
              onClick={onCreate}
              className='flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 cursor-pointer'
            >
              <BookPlus className='h-3.5 w-3.5' />
              {t('publication.nameSection.createButton')}
            </button>
          )}
          {canEdit && (
            <button
              type='button'
              onClick={onEdit}
              className='flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-muted cursor-pointer'
            >
              <Pencil className='h-3.5 w-3.5' />
              {t('publication.nameSection.editButton')}
            </button>
          )}
          {canSubmit && (
            <button
              type='button'
              onClick={() => void onSubmit()}
              disabled={activeAction !== null}
              className='flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {activeAction === 'submit' ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <FileCheck2 className='h-3.5 w-3.5' />
              )}
              {t('publication.nameSection.submitButton')}
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
          {canRemove && (
            <button
              type='button'
              onClick={() => void onRemove()}
              disabled={activeAction !== null}
              className='flex cursor-pointer items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {activeAction === 'remove' ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Trash2 className='h-3.5 w-3.5' />
              )}
              {t('publication.nameSection.removeButton')}
            </button>
          )}
        </div>
      </div>

      {/* Metadata strip */}
      <dl className='grid grid-cols-2 gap-px bg-border sm:grid-cols-4'>
        <MetaItem
          icon={<CheckCircle2 className='h-3.5 w-3.5' />}
          label={t('publication.name.version')}
          value={name ? t('publication.name.versionValue', { n: name.version }) : '—'}
        />
        <MetaItem
          icon={<Clock className='h-3.5 w-3.5' />}
          label={t('publication.name.status')}
          value={name ? name.status : t('publication.name.notStarted')}
          tone={name ? name.status : 'DRAFT'}
        />
        <MetaItem
          icon={<CalendarClock className='h-3.5 w-3.5' />}
          label={t('publication.name.deadline')}
          value={formatDate(deadline)}
        />
        <MetaItem
          icon={<CalendarClock className='h-3.5 w-3.5' />}
          label={t('publication.name.submittedAt')}
          value={formatDate(submittedAt)}
        />
      </dl>
    </div>
  )
}

function MetaItem({
  icon,
  label,
  value,
  tone
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className='flex items-start gap-2 bg-card px-4 py-3'>
      <span className='mt-0.5 text-muted-foreground'>{icon}</span>
      <div className='min-w-0'>
        <dt className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>{label}</dt>
        <dd className='mt-0.5 truncate text-sm font-semibold text-foreground'>
          {tone && tone !== value ? (
            <span className='flex items-center gap-2'>
              <span>{value}</span>
              <NameStatusBadge status={tone} />
            </span>
          ) : (
            value
          )}
        </dd>
      </div>
    </div>
  )
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  // Manual dd/MM/yyyy formatter to avoid pulling in date-fns for this small use.
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function PageGrid({
  name,
  onOpen
}: {
  name: NameListResDtoOutputItemsItem
  onOpen: (page: { pageNumber: number; fileUrl: string }) => void
}) {
  const { t } = useTranslation('mangaka')

  // Sort defensively in case BE returns them out-of-order.
  const pages = [...(name.pages ?? [])].sort((a, b) => a.pageNumber - b.pageNumber)

  return (
    <div className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <header className='flex items-center justify-between border-b border-border px-6 py-3'>
        <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
          {t('publication.name.documentLabel')}
        </h2>
        <span className='text-xs text-muted-foreground'>{t('publication.name.pagesCount', { n: pages.length })}</span>
      </header>
      <div className='p-6'>
        <ul className={cn('grid gap-4', 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5')}>
          {pages.map((pg) => (
            <li key={`${pg.pageNumber}`}>
              <NamePageCard
                pageNumber={pg.pageNumber}
                fileUrl={pg.fileUrl}
                alt={t('publication.nameSection.pageAlt', { n: pg.pageNumber })}
                onClick={() => onOpen({ pageNumber: pg.pageNumber, fileUrl: pg.fileUrl })}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function EmptyName({ hasName, canCreate }: { hasName: boolean; canCreate: boolean }) {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center'>
      <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground'>
        <BookPlus className='h-5 w-5' />
      </div>
      <h2 className='text-base font-semibold text-foreground'>
        {hasName ? t('publication.nameSection.noPages') : t('publication.nameSection.empty')}
      </h2>
      <p className='max-w-md text-sm text-muted-foreground'>
        {canCreate ? t('publication.nameSection.emptyHint') : t('publication.name.lockedHint')}
      </p>
    </div>
  )
}

/**
 * Inline explainer that walks the user through the state machine. Shown only
 * when a Name exists (so we have a status to explain).
 */
function NameStatusExplainer({ status }: { status: NameStatusKey | null }) {
  const { t } = useTranslation('mangaka')
  if (!status) return null

  const steps: { key: NameStatusKey; i18n: string; reached: boolean }[] = [
    { key: 'DRAFT', i18n: 'publication.name.timeline.draft', reached: true },
    {
      key: 'SUBMITTED',
      i18n: 'publication.name.timeline.submitted',
      reached: ['SUBMITTED', 'IN_REVIEW', 'REVISION', 'APPROVED'].includes(status)
    },
    {
      key: 'IN_REVIEW',
      i18n: 'publication.name.timeline.inReview',
      reached: ['IN_REVIEW', 'APPROVED'].includes(status)
    },
    {
      key: 'REVISION',
      i18n: 'publication.name.timeline.revision',
      reached: false // status === 'REVISION' is a rewind; show it as a callout, not a forward step.
    },
    {
      key: 'APPROVED',
      i18n: 'publication.name.timeline.approved',
      reached: status === 'APPROVED'
    }
  ]

  return (
    <div className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <header className='border-b border-border px-6 py-3'>
        <h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
          {t('publication.name.timeline.title')}
        </h2>
      </header>
      <ol className='grid gap-px bg-border sm:grid-cols-5'>
        {steps.map((step) => {
          const isCurrent = step.key === status
          return (
            <li
              key={step.key}
              className={cn(
                'bg-card px-4 py-3 transition-colors',
                isCurrent && 'bg-primary/5',
                step.reached && !isCurrent && 'bg-success/5'
              )}
            >
              <p
                className={cn(
                  'text-[10px] font-bold uppercase tracking-widest',
                  step.reached ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.key}
              </p>
              <p className={cn('mt-1 text-xs', step.reached ? 'text-foreground/90' : 'text-muted-foreground')}>
                {t(step.i18n)}
              </p>
            </li>
          )
        })}
      </ol>
      {status === 'REVISION' && (
        <p className='border-t border-warning/20 bg-warning/5 px-6 py-3 text-xs text-warning'>
          {t('publication.name.timeline.revisionCallout')}
        </p>
      )}
    </div>
  )
}
