import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CreateStageBodyDtoTaskTypesItem, StageListResDtoOutputStagesItem } from '~/api/model/production-stages'
import { Button } from '~/shared/ui'
import { Dialog } from '~/shared/ui/dialog'

import type { ProductionStageManagement } from '../hooks/use-production-stage-management'

const TASK_TYPES: CreateStageBodyDtoTaskTypesItem[] = [
  'BACKGROUND',
  'SCREENTONE',
  'EFFECT_LINES',
  'INKING',
  'COLORING',
  'LETTERING'
]

export type ProductionStageManagementDialogProps = {
  mode: 'create' | 'edit' | 'remove'
  stage: StageListResDtoOutputStagesItem
  management: ProductionStageManagement
  onClose: () => void
}

/** Create, edit, and guarded deletion dialog for a selected production stage. */
export function ProductionStageManagementDialog({
  mode,
  stage,
  management,
  onClose
}: ProductionStageManagementDialogProps) {
  const { t } = useTranslation('mangaka')
  const [name, setName] = useState(mode === 'create' ? '' : stage.name)
  const [taskTypes, setTaskTypes] = useState<CreateStageBodyDtoTaskTypesItem[]>([])
  const [deadline, setDeadline] = useState(toDateTimeLocal(stage.deadline))
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  const isNameValid = name.trim().length > 0
  const isCreateValid = isNameValid && taskTypes.length > 0
  const title = t(`seriesDetail.production.management.${mode}.title`, { name: stage.name })

  const submit = async () => {
    if (mode === 'create') {
      if (!isCreateValid) return
    }
    if (mode === 'edit') {
      if (!isNameValid) return
    }
    const changed =
      mode === 'create'
        ? await management.add({ name: name.trim(), taskTypes, afterStageId: stage.id })
        : mode === 'edit'
          ? await management.update(stage.id, {
              name: name.trim(),
              deadline: deadline ? new Date(deadline).toISOString() : null
            })
          : await management.remove(stage.id)
    if (changed) onClose()
  }

  const footer = showDeleteConfirmation ? (
    <div className='flex justify-end gap-2'>
      <Button
        size='sm'
        variant='ghost'
        disabled={management.isMutating}
        onClick={() => setShowDeleteConfirmation(false)}
      >
        {t('publication.cancel')}
      </Button>
      <Button size='sm' variant='destructive' disabled={management.isMutating} onClick={() => void submit()}>
        {t('seriesDetail.production.management.remove.confirm')}
      </Button>
    </div>
  ) : (
    <div className='flex justify-end gap-2'>
      <Button size='sm' variant='ghost' disabled={management.isMutating} onClick={onClose}>
        {t('publication.cancel')}
      </Button>
      {mode === 'remove' ? (
        <Button size='sm' variant='destructive' onClick={() => setShowDeleteConfirmation(true)}>
          {t('seriesDetail.production.management.remove.action')}
        </Button>
      ) : (
        <Button
          size='sm'
          disabled={management.isMutating || (mode === 'create' ? !isCreateValid : !isNameValid)}
          onClick={() => void submit()}
        >
          {t(`seriesDetail.production.management.${mode}.action`)}
        </Button>
      )}
    </div>
  )

  return (
    <Dialog
      open
      onClose={onClose}
      titleId='production-stage-management-title'
      title={showDeleteConfirmation ? t('seriesDetail.production.management.remove.confirmTitle') : title}
      description={
        showDeleteConfirmation
          ? t('seriesDetail.production.management.remove.confirmDescription', { name: stage.name })
          : t(`seriesDetail.production.management.${mode}.description`, { name: stage.name })
      }
      footer={footer}
      size='sm'
    >
      {showDeleteConfirmation ? (
        <p className='text-sm text-foreground'>{t('seriesDetail.production.management.remove.notice')}</p>
      ) : mode === 'remove' ? (
        <p className='text-sm text-foreground'>{t('seriesDetail.production.management.remove.notice')}</p>
      ) : (
        <div className='space-y-4'>
          <label className='block text-sm font-medium text-foreground'>
            {t('seriesDetail.production.management.name')}
            <input
              autoFocus
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              className='mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring'
            />
            {!isNameValid && (
              <span className='mt-1 block text-xs text-destructive'>
                {t('seriesDetail.production.management.nameRequired')}
              </span>
            )}
          </label>
          {mode === 'create' ? (
            <fieldset>
              <legend className='text-sm font-medium text-foreground'>
                {t('seriesDetail.production.management.taskTypes')}
              </legend>
              <p className='mt-1 text-xs text-muted-foreground'>
                {t('seriesDetail.production.management.taskTypesHint')}
              </p>
              <div className='mt-2 grid grid-cols-2 gap-2'>
                {TASK_TYPES.map((taskType) => (
                  <label key={taskType} className='flex items-center gap-2 text-xs text-foreground'>
                    <input
                      type='checkbox'
                      checked={taskTypes.includes(taskType)}
                      onChange={(event) =>
                        setTaskTypes((current) =>
                          event.target.checked ? [...current, taskType] : current.filter((item) => item !== taskType)
                        )
                      }
                    />
                    {t(`tasks.composer.taskTypeEnum.${taskType}`, taskType)}
                  </label>
                ))}
              </div>
              {taskTypes.length === 0 && (
                <span className='mt-2 block text-xs text-destructive'>
                  {t('seriesDetail.production.management.taskTypesRequired')}
                </span>
              )}
            </fieldset>
          ) : (
            <label className='block text-sm font-medium text-foreground'>
              {t('seriesDetail.production.management.deadline')}
              <input
                type='datetime-local'
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                className='mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring'
              />
            </label>
          )}
        </div>
      )}
    </Dialog>
  )
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}
