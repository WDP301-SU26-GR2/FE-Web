import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

import { Button } from '~/shared/ui'
import { useAssignTaskForm } from '../use-assign-task-form'
import { TaskComposerStepper } from './task-composer-stepper'
import { TaskContextPicker } from './task-context-picker'
import { TaskFields } from './task-fields'
import { TaskAttachmentUploader } from './task-attachment-uploader'
import type { UseTaskComposerDataOptions } from '../use-task-composer-data'
import { useTaskComposerData } from '../use-task-composer-data'
import type { CreateTaskBodyDtoTaskType } from '~/api/model/task'

export interface AssignTaskDialogProps {
  open: boolean
  openFrom: 'studio' | 'workbench'
  preset?: UseTaskComposerDataOptions
  /** Locks only the context supplied by a per-assignment "Assign task" CTA. */
  contextLocks?: {
    assistant?: boolean
    series?: boolean
    page?: boolean
  }
  stageTaskTypes?: CreateTaskBodyDtoTaskType[]
  requireStage?: boolean
  onClose: () => void
  onSuccess?: () => void
  className?: string
}

const STEP_ORDER = ['context', 'work', 'confirm'] as const

/**
 * Thin UI shell around the "Assign task" composer.
 *
 * All state + submit logic lives in `useAssignTaskForm`. This component only:
 *  - Reads the dialog open/close + preset props
 *  - Mounts the 3 step components in the right order
 *  - Renders footer (Back / Next / Submit) based on form state
 */
export function AssignTaskDialog({
  open,
  openFrom,
  preset,
  contextLocks,
  stageTaskTypes,
  requireStage,
  onClose,
  onSuccess
}: AssignTaskDialogProps) {
  if (!open) return null

  // ── Inner component: remounts on each open via `key={open}` so local state
  // (error, etc.) resets cleanly without needing a `useEffect` (which would
  // cascade a synchronous re-render — see React 19 lint rule).
  return (
    <AssignTaskDialogBody
      key={open ? 'open' : 'closed'}
      openFrom={openFrom}
      preset={preset}
      contextLocks={contextLocks}
      stageTaskTypes={stageTaskTypes}
      requireStage={requireStage}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}

interface AssignTaskDialogBodyProps {
  openFrom: 'studio' | 'workbench'
  preset?: UseTaskComposerDataOptions
  contextLocks?: AssignTaskDialogProps['contextLocks']
  stageTaskTypes?: CreateTaskBodyDtoTaskType[]
  requireStage?: boolean
  onClose: () => void
  onSuccess?: () => void
}

function AssignTaskDialogBody({
  openFrom,
  preset,
  contextLocks,
  stageTaskTypes,
  requireStage,
  onClose,
  onSuccess
}: AssignTaskDialogBodyProps) {
  const { t } = useTranslation('mangaka')

  // We need the assignments list to resolve assignmentId → assistantId.
  // useTaskComposerData internally fetches with `activeNow=true`; we just need
  // the list here to feed into the form hook.
  //
  // CRITICAL: a SINGLE instance of `useTaskComposerData` is shared between
  // `TaskContextPicker` and `PagePickerWithPopup`. Otherwise each component
  // has its own state closure (the chapter selected in the picker would NOT
  // propagate to the page picker → page field stays disabled forever).
  const composer = useTaskComposerData(preset ?? {})

  const form = useAssignTaskForm({
    preset,
    assignments: composer.data.assignments,
    stageTaskTypes,
    stages: composer.data.stages,
    requireStage
  })

  const [error, setError] = useState<string | null>(null)

  const currentStepIndex = STEP_ORDER.indexOf(form.state.step)
  const canGoNext =
    (form.state.step === 'context' ? form.canGoNextFromContext : form.canGoNextFromWork) &&
    !(form.state.step === 'context' && composer.data.loading.stages)

  const handleContextChange = (ctx: Parameters<typeof form.setContext>[0]) => {
    setError(null)
    form.setContext(ctx)
  }

  const handleWorkChange = (work: Parameters<typeof form.setWork>[0]) => {
    setError(null)
    form.setWork(work)
  }

  const handleAssetsChange = (assets: Array<{ assetId: string; key: string }>) => {
    setError(null)
    form.setWork({ assetIds: assets.map((a) => a.assetId) })
  }

  const handleSubmit = async () => {
    const result = await form.submit()
    if (result.success) {
      onSuccess?.()
      onClose()
      form.reset()
    } else {
      setError(result.error ?? t('studio.tasks.composer.errors.assignFailed'))
    }
  }

  // Pull the resolved selected assignment so the confirm step can show
  // human-friendly names (displayName, series title, chapter number, etc.).
  const confirmedSummary = useMemo(() => {
    const a = form.selectedAssignment
    if (!a) return null
    return {
      assignmentId: a.id,
      assistantDisplayName: a.assistant?.displayName ?? null,
      assistantUserId: a.assistantId,
      seriesId: a.seriesId ?? null,
      assignedTaskTypes: a.assignedTaskTypes
    }
  }, [form.selectedAssignment])

  const selectedPageLabels = useMemo(
    () =>
      form.state.pageIds
        .map((id) => composer.data.pages.find((page) => page.id === id)?.pageNumber)
        .filter((pageNumber): pageNumber is number => pageNumber !== undefined),
    [composer.data.pages, form.state.pageIds]
  )
  const selectedRegionLabels = form.state.regionIds
    .map((id) => composer.data.regions.find((region) => region.id === id)?.label)
    .filter((label): label is string => Boolean(label))
  const selectedStage = composer.data.stages.find((stage) => stage.id === form.state.stageId)

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='assign-task-title'
      className='fixed inset-0 z-50 flex items-center justify-center bg-muted-foreground/60 p-4'
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className='flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl'>
        {/* Header */}
        <header className='flex items-center justify-between border-b border-border px-6 py-4'>
          <div>
            <h2 id='assign-task-title' className='text-lg font-semibold text-foreground'>
              {t('studio.tasks.composer.title')}
            </h2>
            <p className='mt-0.5 text-sm text-muted-foreground'>
              {openFrom === 'studio' ? t('studio.tasks.composer.fromStudio') : t('studio.tasks.composer.fromWorkbench')}
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label={t('studio.tasks.composer.close')}
            className='rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground'
          >
            <X className='h-5 w-5' />
          </button>
        </header>

        {/* Stepper */}
        <div className='border-b border-border px-6 py-3'>
          <TaskComposerStepper currentStep={form.state.step} />
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto px-6 py-5'>
          {form.state.step === 'context' && (
            <TaskContextPicker
              openFrom={openFrom}
              preset={preset}
              contextLocks={contextLocks}
              stageId={form.state.stageId}
              composer={composer}
              selected={{
                assignmentId: form.state.assignmentId,
                seriesId: form.state.seriesId,
                chapterId: form.state.chapterId,
                pageId: form.state.pageId,
                pageIds: form.state.pageIds,
                regionIds: form.state.regionIds,
                stageId: form.state.stageId
              }}
              onChange={handleContextChange}
            />
          )}

          {form.state.step === 'work' && (
            <div className='space-y-6'>
              {form.requiresStage && form.allowedTaskTypes.length > 0 && (
                <p className='text-xs text-muted-foreground'>
                  {t('studio.tasks.composer.allowedTaskTypesHint', {
                    types: form.allowedTaskTypes.map((tt) => t(`studio.tasks.composer.taskTypeEnum.${tt}`)).join(', ')
                  })}
                </p>
              )}
              <TaskFields
                taskType={form.state.taskType}
                deadline={form.state.deadline ?? ''}
                priority={form.state.priority}
                onTaskTypeChange={(v) => handleWorkChange({ taskType: v })}
                onDeadlineChange={(v) => handleWorkChange({ deadline: v })}
                onPriorityChange={(v) => handleWorkChange({ priority: v })}
                allowedTaskTypes={form.allowedTaskTypes}
              />
              {form.state.regionIds.length > 1 && form.state.pageIds.length === 1 && (
                <label className='flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4'>
                  <input
                    type='checkbox'
                    checked={Boolean(form.state.splitRegionsIntoTasks)}
                    onChange={(event) => handleWorkChange({ splitRegionsIntoTasks: event.target.checked })}
                    className='mt-0.5 size-4 rounded border-input'
                  />
                  <span>
                    <span className='block text-sm font-bold text-foreground'>
                      {t('studio.tasks.composer.batch.title', { count: form.state.regionIds.length })}
                    </span>
                    <span className='mt-1 block text-xs leading-5 text-muted-foreground'>
                      {t('studio.tasks.composer.batch.description')}
                    </span>
                  </span>
                </label>
              )}
              <div className='space-y-1.5'>
                <label htmlFor='task-description' className='block text-sm font-medium text-foreground'>
                  {t('studio.tasks.composer.description')}
                </label>
                <textarea
                  id='task-description'
                  value={form.state.description ?? ''}
                  onChange={(event) => handleWorkChange({ description: event.target.value })}
                  maxLength={2000}
                  rows={4}
                  className='w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring'
                />
              </div>
              {form.state.pageIds.length > 1 && (
                <div className='space-y-1.5'>
                  <label htmlFor='task-group-title' className='block text-sm font-medium text-foreground'>
                    {t('studio.tasks.composer.groupTitle')}
                  </label>
                  <input
                    id='task-group-title'
                    value={form.state.groupTitle ?? ''}
                    onChange={(event) => handleWorkChange({ groupTitle: event.target.value })}
                    maxLength={200}
                    className='w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring'
                  />
                </div>
              )}
              <div className='space-y-2'>
                <p className='text-sm font-medium text-foreground'>{t('studio.tasks.composer.attachments.label')}</p>
                <TaskAttachmentUploader assetType='REFERENCE' onAssetsChange={handleAssetsChange} />
              </div>
            </div>
          )}

          {form.state.step === 'confirm' && (
            <div className='space-y-4'>
              <p className='text-sm text-muted-foreground'>{t('studio.tasks.composer.confirm.description')}</p>
              <dl className='rounded-lg border border-border bg-muted/20 p-4 text-sm'>
                <div className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-2'>
                  <dt className='font-medium text-foreground'>{t('studio.tasks.composer.confirm.assistant')}</dt>
                  <dd className='text-foreground'>
                    {confirmedSummary?.assistantDisplayName ?? t('myStudio.card.unnamedAssistant')}
                  </dd>
                  {form.requiresStage && (
                    <>
                      <dt className='font-medium text-foreground'>{t('studio.tasks.composer.confirm.stage')}</dt>
                      <dd className='text-foreground'>
                        {selectedStage
                          ? t('studio.tasks.composer.stageOption', {
                              order: selectedStage.order,
                              name: selectedStage.name
                            })
                          : '—'}
                      </dd>
                    </>
                  )}
                  <dt className='font-medium text-foreground'>{t('studio.tasks.composer.confirm.taskType')}</dt>
                  <dd className='text-foreground'>
                    {form.state.taskType ? t(`studio.tasks.composer.taskTypeEnum.${form.state.taskType}`) : '—'}
                  </dd>
                  <dt className='font-medium text-foreground'>
                    {form.state.pageIds.length > 1
                      ? t('studio.tasks.composer.confirm.pages')
                      : t('studio.tasks.composer.confirm.page')}
                  </dt>
                  <dd className='text-foreground'>
                    {selectedPageLabels
                      .map((pageNumber) => t('publication.nameSection.pageNumber', { n: pageNumber }))
                      .join(', ')}
                  </dd>
                  {form.state.regionIds.length > 0 && form.state.pageIds.length === 1 && (
                    <>
                      <dt className='font-medium text-foreground'>{t('studio.tasks.composer.confirm.region')}</dt>
                      <dd className='text-foreground'>
                        {selectedRegionLabels.join(', ') || t('studio.tasks.composer.regionSelected')}
                      </dd>
                    </>
                  )}
                  {form.state.splitRegionsIntoTasks && form.state.regionIds.length > 1 && (
                    <>
                      <dt className='font-medium text-foreground'>{t('studio.tasks.composer.confirm.creationMode')}</dt>
                      <dd className='text-foreground'>
                        {t('studio.tasks.composer.confirm.batchMode', { count: form.state.regionIds.length })}
                      </dd>
                    </>
                  )}
                  <dt className='font-medium text-foreground'>{t('studio.tasks.composer.confirm.deadline')}</dt>
                  <dd className='text-foreground'>
                    {form.state.deadline
                      ? new Date(form.state.deadline).toLocaleString()
                      : t('studio.tasks.composer.confirm.noDeadline')}
                  </dd>
                  <dt className='font-medium text-foreground'>{t('studio.tasks.composer.confirm.priority')}</dt>
                  <dd className='text-foreground'>{form.state.priority ?? '—'}</dd>
                  <dt className='font-medium text-foreground'>{t('studio.tasks.composer.confirm.attachments')}</dt>
                  <dd className='text-foreground'>
                    {form.state.assetIds?.length
                      ? t('studio.tasks.composer.confirm.attachmentCount', { count: form.state.assetIds.length })
                      : t('studio.tasks.composer.confirm.noAttachments')}
                  </dd>
                </div>
              </dl>

              {error && (
                <div
                  role='alert'
                  className='rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'
                >
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className='flex items-center justify-end gap-3 border-t border-border px-6 py-4'>
          {currentStepIndex > 0 && (
            <Button variant='secondary' onClick={form.goBack} disabled={form.isSubmitting}>
              {t('studio.tasks.composer.back')}
            </Button>
          )}
          {currentStepIndex < STEP_ORDER.length - 1 ? (
            <Button onClick={form.goNext} disabled={!canGoNext}>
              {t('studio.tasks.composer.next')}
            </Button>
          ) : (
            <Button onClick={() => void handleSubmit()} disabled={form.isSubmitting}>
              {form.isSubmitting ? t('studio.tasks.composer.submitting') : t('studio.tasks.composer.submit')}
            </Button>
          )}
        </footer>
      </div>
    </div>
  )
}
