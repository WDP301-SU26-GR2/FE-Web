import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import type { CreateTaskBodyDto } from '~/api/model/task'

const TASK_TYPES: Array<CreateTaskBodyDto['taskType']> = [
  'BACKGROUND',
  'SCREENTONE',
  'EFFECT_LINES',
  'INKING',
  'COLORING',
  'LETTERING'
]

export interface TaskFieldsProps {
  taskType: CreateTaskBodyDto['taskType'] | undefined
  deadline: string
  priority: number | undefined
  onTaskTypeChange: (v: CreateTaskBodyDto['taskType'] | undefined) => void
  onDeadlineChange: (v: string) => void
  onPriorityChange: (v: number | undefined) => void
  allowedTaskTypes?: CreateTaskBodyDto['taskType'][]
  className?: string
}

export function TaskFields({
  taskType,
  deadline,
  priority,
  onTaskTypeChange,
  onDeadlineChange,
  onPriorityChange,
  allowedTaskTypes,
  className
}: TaskFieldsProps) {
  const { t } = useTranslation('mangaka')
  const types = allowedTaskTypes ?? TASK_TYPES

  const handleTaskTypeSelect = useCallback(
    (type: CreateTaskBodyDto['taskType']) => {
      onTaskTypeChange(taskType === type ? undefined : type)
    },
    [onTaskTypeChange, taskType]
  )

  const handlePriorityInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      onPriorityChange(val === '' ? undefined : parseInt(val, 10))
    },
    [onPriorityChange]
  )

  return (
    <div className={`space-y-5 ${className ?? ''}`}>
      {/* Task Type — segmented cards */}
      <fieldset className='space-y-2'>
        <legend className='text-sm font-medium text-foreground'>{t('studio.tasks.composer.taskType')}</legend>
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
          {types.map((type) => (
            <button
              key={type}
              type='button'
              onClick={() => handleTaskTypeSelect(type)}
              aria-pressed={taskType === type}
              className={`rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                taskType === type
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-foreground hover:border-primary/50'
              }`}
            >
              {t(`studio.tasks.composer.taskTypeEnum.${type}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Deadline */}
      <div className='space-y-1.5'>
        <label htmlFor='task-deadline' className='block text-sm font-medium text-foreground'>
          {t('studio.tasks.composer.deadline')}
        </label>
        <input
          id='task-deadline'
          type='datetime-local'
          value={deadline}
          onChange={(e) => onDeadlineChange(e.target.value)}
          className='w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring'
        />
        <p className='text-xs text-muted-foreground'>{t('studio.tasks.composer.deadlineHint')}</p>
      </div>

      {/* Priority */}
      <div className='space-y-1.5'>
        <label htmlFor='task-priority' className='block text-sm font-medium text-foreground'>
          {t('studio.tasks.composer.priority')}
        </label>
        <input
          id='task-priority'
          type='number'
          min='0'
          step='1'
          value={priority ?? ''}
          onChange={handlePriorityInput}
          placeholder='0'
          className='w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring'
        />
        <p className='text-xs text-muted-foreground'>{t('studio.tasks.composer.priorityHint')}</p>
      </div>
    </div>
  )
}
