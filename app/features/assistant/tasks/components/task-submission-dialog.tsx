import { Download, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { TaskResDtoOutputVersionsItem } from '~/api/model/task'
import { useTaskSignedUrl } from '~/shared/hooks/use-task-signed-url'
import { Dialog } from '~/shared/ui/dialog'

export interface TaskSubmissionDialogProps {
  open: boolean
  taskId: string | null
  version: TaskResDtoOutputVersionsItem | null
  onOpenChange: (next: boolean) => void
}

/** Shows exactly one Assistant submission, selected from the version history. */
export function TaskSubmissionDialog({ open, taskId, version, onOpenChange }: TaskSubmissionDialogProps) {
  const { t } = useTranslation('assistant')
  const signed = useTaskSignedUrl(taskId ?? undefined, version?.file)

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      titleId='assistant-task-submission-title'
      title={t('tasks.submission.title', { number: version?.versionNumber ?? '' })}
      descriptionId='assistant-task-submission-description'
      description={t('tasks.submission.description')}
      size='xl'
    >
      {!version?.file ? (
        <p className='text-sm text-muted-foreground'>{t('tasks.submission.noFile')}</p>
      ) : signed.status === 'ready' ? (
        <div className='space-y-3'>
          <div className='flex justify-center overflow-hidden rounded-lg border border-border bg-muted/30'>
            <img
              src={signed.url}
              alt={t('tasks.submission.imageAlt', { number: version.versionNumber })}
              className='max-h-[65vh] max-w-full object-contain'
            />
          </div>
          <div className='flex justify-end'>
            <a
              href={signed.url}
              target='_blank'
              rel='noreferrer'
              className='inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted'
            >
              <Download className='h-3.5 w-3.5' />
              {t('tasks.submission.openFile')}
            </a>
          </div>
        </div>
      ) : (
        <div className='flex min-h-64 items-center justify-center text-muted-foreground'>
          <Loader2 className='h-6 w-6 animate-spin' />
        </div>
      )}
    </Dialog>
  )
}
