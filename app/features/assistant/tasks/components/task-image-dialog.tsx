import { Download, FileText, ImageIcon, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { TaskResDtoOutput, TaskResDtoOutputAssetsItem } from '~/api/model/task'
import { ImageRegionOverlay } from '~/shared/components/image-region-overlay'
import { useTaskSignedUrl } from '~/shared/hooks/use-task-signed-url'
import { Dialog } from '~/shared/ui/dialog'

export interface TaskResourcesDialogProps {
  open: boolean
  task: TaskResDtoOutput | null
  onOpenChange: (next: boolean) => void
}

/**
 * Files supplied by the Mangaka only. Assistant submissions deliberately do
 * not appear here; they are reviewed in TaskSubmissionDialog by version.
 */
export function TaskResourcesDialog({ open, task, onOpenChange }: TaskResourcesDialogProps) {
  const { t } = useTranslation('assistant')
  const productionInput = task?.stageInputFile ?? task?.pageOriginalFile ?? null
  const inputLabel = task?.stageInputFile ? t('tasks.resources.stageInput') : t('tasks.resources.pageOriginal')
  const hasSeparateOriginal = Boolean(
    task?.stageInputFile && task.pageOriginalFile && task.stageInputFile !== task.pageOriginalFile
  )

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      titleId='assistant-task-resources-title'
      title={t('tasks.resources.title')}
      descriptionId='assistant-task-resources-description'
      description={t('tasks.resources.description')}
      size='xl'
    >
      {!task ? null : (
        <div className='space-y-6'>
          <section className='space-y-2'>
            <h3 className='text-sm font-bold text-foreground'>{inputLabel}</h3>
            <TaskSourcePreview task={task} r2Key={productionInput} label={inputLabel} showRegions />
          </section>

          {hasSeparateOriginal && task.pageOriginalFile && (
            <section className='space-y-2'>
              <h3 className='text-sm font-bold text-foreground'>{t('tasks.resources.pageOriginalReference')}</h3>
              <TaskSourcePreview
                task={task}
                r2Key={task.pageOriginalFile}
                label={t('tasks.resources.pageOriginalReference')}
                showRegions
              />
            </section>
          )}

          <section className='space-y-2'>
            <h3 className='text-sm font-bold text-foreground'>{t('tasks.resources.attachments')}</h3>
            {task.assets?.length ? (
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                {task.assets.map((asset) => (
                  <ReferenceAsset key={asset.id} taskId={task.id} asset={asset} />
                ))}
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>{t('tasks.resources.noAttachments')}</p>
            )}
          </section>
        </div>
      )}
    </Dialog>
  )
}

function TaskSourcePreview({
  task,
  r2Key,
  label,
  showRegions
}: {
  task: TaskResDtoOutput
  r2Key: string | null
  label: string
  showRegions: boolean
}) {
  const { t } = useTranslation('assistant')
  const signed = useTaskSignedUrl(task.id, r2Key)

  if (!r2Key)
    return (
      <p className='rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground'>
        {t('tasks.resources.noInput')}
      </p>
    )
  if (signed.status === 'loading' || signed.status === 'idle')
    return (
      <div className='flex min-h-64 items-center justify-center rounded-lg border border-border bg-muted/30'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  if (signed.status === 'error')
    return (
      <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
        {t('tasks.resources.loadFailed')}
      </p>
    )

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-muted/30'>
      <ImageRegionOverlay
        src={signed.url}
        alt={label}
        containerClassName='flex justify-center'
        className='max-h-[55vh] max-w-full'
        regions={showRegions ? task.regions : undefined}
      />
      <div className='flex justify-end border-t border-border p-2'>
        <a
          href={signed.url}
          target='_blank'
          rel='noreferrer'
          className='inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted'
        >
          <Download className='h-3.5 w-3.5' />
          {t('tasks.resources.openFile')}
        </a>
      </div>
    </div>
  )
}

function ReferenceAsset({ taskId, asset }: { taskId: string; asset: TaskResDtoOutputAssetsItem }) {
  const { t } = useTranslation('assistant')
  const signed = useTaskSignedUrl(taskId, asset.filePath)
  const isImage = /\.(png|jpe?g|webp)$/i.test(asset.filePath)

  return (
    <article className='overflow-hidden rounded-lg border border-border bg-card'>
      {isImage && signed.status === 'ready' ? (
        <a href={signed.url} target='_blank' rel='noreferrer' className='block bg-muted/30'>
          <img src={signed.url} alt={asset.name} className='h-40 w-full object-cover' />
        </a>
      ) : (
        <div className='flex h-28 items-center justify-center bg-muted/30 text-muted-foreground'>
          {signed.status === 'loading' ? (
            <Loader2 className='h-5 w-5 animate-spin' />
          ) : isImage ? (
            <ImageIcon className='h-6 w-6' />
          ) : (
            <FileText className='h-7 w-7' />
          )}
        </div>
      )}
      <div className='flex items-center gap-2 p-3'>
        <p className='min-w-0 flex-1 truncate text-xs font-semibold text-foreground'>{asset.name}</p>
        {signed.status === 'ready' && (
          <a
            href={signed.url}
            target='_blank'
            rel='noreferrer'
            className='inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted'
          >
            <Download className='h-3.5 w-3.5' />
            {t('tasks.resources.openFile')}
          </a>
        )}
      </div>
    </article>
  )
}
