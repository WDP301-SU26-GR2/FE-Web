import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

import { Button } from '~/shared/ui'
import { useAssignTask } from '../use-assign-task'
import type { CreateTaskBodyDto } from '~/api/model/task'
import { TaskComposerStepper, type ComposerStep } from './task-composer-stepper'
import { TaskContextPicker } from './task-context-picker'
import { TaskFields } from './task-fields'
import { TaskAttachmentUploader } from './task-attachment-uploader'
import type { UseTaskComposerDataOptions } from '../use-task-composer-data'

export interface AssignTaskDialogProps {
  open: boolean
  openFrom: 'studio' | 'workbench'
  preset?: UseTaskComposerDataOptions
  onClose: () => void
  onSuccess?: () => void
  className?: string
}

interface ComposerState {
  step: ComposerStep
  assignmentId?: string
  assistantId?: string
  seriesId?: string
  chapterId?: string
  pageId?: string
  regionId?: string
  taskType?: CreateTaskBodyDto['taskType']
  deadline?: string
  priority?: number
  assetIds?: string[]
}

const STEP_ORDER: ComposerStep[] = ['context', 'work', 'confirm']

export function AssignTaskDialog({ open, openFrom, preset, onClose, onSuccess }: AssignTaskDialogProps) {
  const { t } = useTranslation('mangaka')
  const { assignTask, isSubmitting } = useAssignTask()

  const [state, setState] = useState<ComposerState>({
    step: 'context',
    assistantId: preset?.presetAssignmentId,
    assignmentId: preset?.presetAssignmentId,
    seriesId: preset?.presetSeriesId,
    chapterId: preset?.presetChapterId,
    pageId: preset?.presetPageId,
    regionId: preset?.presetRegionId
  })

  const [error, setError] = useState<string | null>(null)

  // Find assistantId from assignment
  const handleContextChange = useCallback(
    (ctx: { assignmentId?: string; seriesId?: string; chapterId?: string; pageId?: string; regionId?: string }) => {
      setState((prev) => ({ ...prev, ...ctx }))
    },
    []
  )

  const handleWorkChange = useCallback(
    (work: { taskType?: CreateTaskBodyDto['taskType']; deadline?: string; priority?: number; assetIds?: string[] }) => {
      setState((prev) => ({ ...prev, ...work }))
    },
    []
  )

  const handleAssetsChange = useCallback((assets: Array<{ assetId: string; key: string }>) => {
    setState((prev) => ({
      ...prev,
      assetIds: assets.map((a) => a.assetId)
    }))
  }, [])

  const goNext = useCallback(() => {
    setState((prev) => {
      const idx = STEP_ORDER.indexOf(prev.step)
      const next = STEP_ORDER[idx + 1]
      return next ? { ...prev, step: next } : prev
    })
  }, [])

  const goBack = useCallback(() => {
    setState((prev) => {
      const idx = STEP_ORDER.indexOf(prev.step)
      const prev_ = STEP_ORDER[idx - 1]
      return prev_ ? { ...prev, step: prev_ } : prev
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!state.assistantId || !state.pageId || !state.taskType) {
      setError('Vui lòng điền đầy đủ thông tin.')
      return
    }
    setError(null)
    const result = await assignTask({
      assistantId: state.assistantId,
      pageId: state.pageId,
      regionId: state.regionId,
      taskType: state.taskType,
      deadline: state.deadline ? new Date(state.deadline).toISOString() : undefined,
      priority: state.priority,
      assetIds: state.assetIds
    })
    if (result.success) {
      onSuccess?.()
      onClose()
    } else {
      setError(result.error ?? 'Không thể giao task.')
    }
  }, [state, assignTask, onClose, onSuccess])

  if (!open) return null

  const canGoNext = state.step === 'context' ? !!state.assistantId && !!state.pageId : !!state.taskType

  const currentStepIndex = STEP_ORDER.indexOf(state.step)

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='assign-task-title'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
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
          <TaskComposerStepper currentStep={state.step} />
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto px-6 py-5'>
          {state.step === 'context' && (
            <TaskContextPicker
              openFrom={openFrom}
              preset={preset}
              selected={{
                assignmentId: state.assignmentId,
                seriesId: state.seriesId,
                chapterId: state.chapterId,
                pageId: state.pageId,
                regionId: state.regionId
              }}
              onChange={handleContextChange}
            />
          )}

          {state.step === 'work' && (
            <div className='space-y-6'>
              <TaskFields
                taskType={state.taskType}
                deadline={state.deadline ?? ''}
                priority={state.priority}
                onTaskTypeChange={(v) => handleWorkChange({ taskType: v })}
                onDeadlineChange={(v) => handleWorkChange({ deadline: v })}
                onPriorityChange={(v) => handleWorkChange({ priority: v })}
              />
              <div className='space-y-2'>
                <p className='text-sm font-medium text-foreground'>{t('studio.tasks.composer.attachments.label')}</p>
                <TaskAttachmentUploader onAssetsChange={handleAssetsChange} />
              </div>
            </div>
          )}

          {state.step === 'confirm' && (
            <div className='space-y-4'>
              <p className='text-sm text-muted-foreground'>{t('studio.tasks.composer.confirm.description')}</p>
              <dl className='rounded-lg border border-border bg-muted/20 p-4 text-sm'>
                <div className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-2'>
                  <dt className='font-medium text-foreground'>{t('studio.tasks.composer.confirm.taskType')}</dt>
                  <dd className='text-foreground'>
                    {state.taskType ? t(`studio.tasks.composer.taskTypeEnum.${state.taskType}`) : '—'}
                  </dd>
                  <dt className='font-medium text-foreground'>{t('studio.tasks.composer.confirm.page')}</dt>
                  <dd className='text-foreground'>{state.pageId ?? '—'}</dd>
                  {state.regionId && (
                    <>
                      <dt className='font-medium text-foreground'>{t('studio.tasks.composer.confirm.region')}</dt>
                      <dd className='text-foreground'>{state.regionId}</dd>
                    </>
                  )}
                  <dt className='font-medium text-foreground'>{t('studio.tasks.composer.confirm.deadline')}</dt>
                  <dd className='text-foreground'>
                    {state.deadline
                      ? new Date(state.deadline).toLocaleString()
                      : t('studio.tasks.composer.confirm.noDeadline')}
                  </dd>
                  <dt className='font-medium text-foreground'>{t('studio.tasks.composer.confirm.priority')}</dt>
                  <dd className='text-foreground'>{state.priority ?? '—'}</dd>
                  <dt className='font-medium text-foreground'>{t('studio.tasks.composer.confirm.attachments')}</dt>
                  <dd className='text-foreground'>
                    {state.assetIds?.length
                      ? t('studio.tasks.composer.confirm.attachmentCount', { count: state.assetIds.length })
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
            <Button variant='secondary' onClick={goBack} disabled={isSubmitting}>
              {t('studio.tasks.composer.back')}
            </Button>
          )}
          {currentStepIndex < STEP_ORDER.length - 1 ? (
            <Button onClick={goNext} disabled={!canGoNext}>
              {t('studio.tasks.composer.next')}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? t('studio.tasks.composer.submitting') : t('studio.tasks.composer.submit')}
            </Button>
          )}
        </footer>
      </div>
    </div>
  )
}
