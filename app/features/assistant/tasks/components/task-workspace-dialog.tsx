import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, FileText, Image, Loader2, Eye, PlayCircle, Send } from 'lucide-react'

import { Dialog } from '~/shared/ui/dialog'
import { Button } from '~/shared/ui/button'
import { cn } from '~/shared/lib/cn'
import type { TaskResDtoOutputVersionsItem } from '~/api/model/task'
import { useTaskSignedUrl } from '~/shared/hooks/use-task-signed-url'
import { TaskResourcesDialog } from './task-image-dialog'
import { TaskSubmissionDialog } from './task-submission-dialog'
import { useAssistantTaskActions } from '../use-assistant-task-actions'
import { useAssistantTaskWorkspace } from '../use-assistant-task-workspace'

export interface TaskWorkspaceDialogProps {
  taskId: string | null
  onClose: () => void
  onTaskChanged: () => void
}

function formatDate(iso: string, locale: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}

export function TaskWorkspaceDialog({ taskId, onClose, onTaskChanged }: TaskWorkspaceDialogProps) {
  const { t } = useTranslation('assistant')
  const workspace = useAssistantTaskWorkspace(taskId)
  const actions = useAssistantTaskActions()
  const [resultFile, setResultFile] = useState<File | null>(null)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<TaskResDtoOutputVersionsItem | null>(null)
  const task = workspace.task
  const canStart = task?.status === 'ASSIGNED'
  const canSubmit = task?.status === 'IN_PROGRESS' || task?.status === 'REVISION_REQUESTED'
  const unresolvedRevisions = workspace.revisions.filter((revision) => !revision.isResolved)
  const canResolveRevision = task?.status === 'SUBMITTED' || task?.status === 'UNDER_REVIEW'

  const reloadAfterAction = () => {
    workspace.refresh()
    onTaskChanged()
  }

  const submitResult = async () => {
    if (!task || !resultFile) return
    if (await actions.submit(task.id, resultFile)) {
      setResultFile(null)
      reloadAfterAction()
    }
  }

  return (
    <>
      <Dialog
        open={taskId !== null}
        onClose={onClose}
        titleId='assistant-task-workspace-title'
        title={t('tasks.workspace.title')}
        descriptionId='assistant-task-workspace-description'
        description={t('tasks.workspace.description')}
        size='xl'
        footer={
          task && (
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <span className='text-xs text-muted-foreground'>{t(`tasks.filters.statuses.${task.status}`)}</span>
              <div className='flex flex-wrap gap-2'>
                <Button variant='outline' size='sm' onClick={() => setResourcesOpen(true)}>
                  <Image className='h-3.5 w-3.5' />
                  {t('tasks.workspace.viewTaskFiles')}
                </Button>
                {canStart && (
                  <Button
                    size='sm'
                    disabled={actions.isMutating}
                    onClick={() => {
                      void actions.start(task.id).then((success) => success && reloadAfterAction())
                    }}
                  >
                    <PlayCircle className='h-3.5 w-3.5' />
                    {t('tasks.actions.start')}
                  </Button>
                )}
              </div>
            </div>
          )
        }
      >
        {workspace.isLoading && !task ? (
          <div className='flex min-h-64 items-center justify-center text-muted-foreground'>
            <Loader2 className='h-6 w-6 animate-spin' />
          </div>
        ) : workspace.error ? (
          <div
            role='alert'
            className='flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'
          >
            <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
            <div>
              <p>{workspace.error}</p>
              <Button className='mt-3' variant='outline' size='sm' onClick={workspace.refresh}>
                {t('tasks.error.retry')}
              </Button>
            </div>
          </div>
        ) : task ? (
          <div className='space-y-6'>
            {task.statusReason && (
              <div
                className={cn(
                  'rounded-lg border p-3 text-sm',
                  task.status === 'CANCELLED'
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-border bg-muted text-muted-foreground'
                )}
              >
                <strong>{t('tasks.workspace.statusReason')} </strong>
                {task.statusReason}
              </div>
            )}

            <section className='space-y-2'>
              <h3 className='text-sm font-bold text-foreground'>{t('tasks.workspace.taskDescription')}</h3>
              <p className='whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground'>
                {task.description || t('tasks.workspace.noDescription')}
              </p>
              <p className='text-xs text-muted-foreground'>
                {task.stageInputFile ? t('tasks.workspace.stageInputHint') : t('tasks.workspace.legacyInputHint')}
              </p>
            </section>

            <section className='space-y-2'>
              <h3 className='flex items-center gap-2 text-sm font-bold text-foreground'>
                <FileText className='h-4 w-4 text-primary' />
                {t('tasks.workspace.versions')}
              </h3>
              {task.versions.length ? (
                <div className='space-y-2'>
                  {[...task.versions]
                    .sort((left, right) => right.versionNumber - left.versionNumber)
                    .map((version) => (
                      <SubmissionHistoryItem
                        key={version.versionNumber}
                        taskId={task.id}
                        version={version}
                        onOpen={setSelectedVersion}
                      />
                    ))}
                </div>
              ) : (
                <p className='text-sm text-muted-foreground'>{t('tasks.workspace.noVersions')}</p>
              )}
            </section>

            {canSubmit && (
              <section className='rounded-xl border border-primary/30 bg-primary/5 p-4'>
                <h3 className='text-sm font-bold text-foreground'>{t('tasks.workspace.submitTitle')}</h3>
                <p className='mt-1 text-xs text-muted-foreground'>{t('tasks.workspace.submitHint')}</p>
                <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
                  <input
                    type='file'
                    accept='image/png,image/jpeg,image/webp,application/pdf'
                    disabled={actions.isMutating}
                    onChange={(event) => setResultFile(event.target.files?.[0] ?? null)}
                    className='block min-w-0 flex-1 text-xs text-foreground file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground'
                  />
                  <Button size='sm' disabled={!resultFile || actions.isMutating} onClick={() => void submitResult()}>
                    <Send className='h-3.5 w-3.5' />
                    {t('tasks.actions.submit')}
                  </Button>
                </div>
              </section>
            )}

            {unresolvedRevisions.length > 0 && (
              <section className='rounded-xl border border-border bg-muted/30 p-4'>
                <h3 className='text-sm font-bold text-foreground'>{t('tasks.workspace.revisionTracker')}</h3>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {canResolveRevision ? t('tasks.workspace.resolveHint') : t('tasks.workspace.resolveAfterSubmit')}
                </p>
                <div className='mt-3 space-y-2'>
                  {unresolvedRevisions.map((revision) => (
                    <div
                      key={revision.id}
                      className='flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-sm sm:flex-row sm:items-center sm:justify-between'
                    >
                      <p>
                        <strong>{t('tasks.workspace.revisionRound', { round: revision.round })}</strong> —{' '}
                        {revision.reason}
                      </p>
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={!canResolveRevision || actions.isMutating}
                        onClick={() =>
                          void actions.resolveRevision(revision.id).then((success) => success && workspace.refresh())
                        }
                      >
                        <CheckCircle2 className='h-3.5 w-3.5' />
                        {t('tasks.actions.resolveRevision')}
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : null}
      </Dialog>
      <TaskResourcesDialog open={resourcesOpen} task={task} onOpenChange={setResourcesOpen} />
      <TaskSubmissionDialog
        open={selectedVersion !== null}
        taskId={task?.id ?? null}
        version={selectedVersion}
        onOpenChange={(next) => {
          if (!next) setSelectedVersion(null)
        }}
      />
    </>
  )
}

function SubmissionHistoryItem({
  taskId,
  version,
  onOpen
}: {
  taskId: string
  version: TaskResDtoOutputVersionsItem
  onOpen: (version: TaskResDtoOutputVersionsItem) => void
}) {
  const { t, i18n } = useTranslation('assistant')
  const signed = useTaskSignedUrl(taskId, version.file)

  return (
    <article className='overflow-hidden rounded-lg border border-border bg-card'>
      <div className='flex flex-col gap-3 p-3 sm:flex-row'>
        <button
          type='button'
          disabled={!version.file}
          onClick={() => onOpen(version)}
          className='flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30 sm:w-36 disabled:cursor-not-allowed'
          aria-label={t('tasks.submission.viewVersion', { number: version.versionNumber })}
        >
          {signed.status === 'ready' ? (
            <img src={signed.url} alt='' className='h-full w-full object-cover' />
          ) : (
            <Image className='h-5 w-5 text-muted-foreground' />
          )}
        </button>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <strong className='text-sm text-foreground'>
              {t('tasks.workspace.versionNumber', { number: version.versionNumber })}
            </strong>
            <span className='text-xs text-muted-foreground'>
              {t(`tasks.workspace.reviewStatus.${version.reviewStatus}`)} ·{' '}
              {formatDate(version.submittedAt, i18n.language)}
            </span>
          </div>
          {version.reviewerNote && <p className='mt-2 text-xs text-muted-foreground'>{version.reviewerNote}</p>}
          <Button className='mt-3' variant='outline' size='sm' disabled={!version.file} onClick={() => onOpen(version)}>
            <Eye className='h-3.5 w-3.5' />
            {t('tasks.submission.viewVersion', { number: version.versionNumber })}
          </Button>
        </div>
      </div>
    </article>
  )
}
