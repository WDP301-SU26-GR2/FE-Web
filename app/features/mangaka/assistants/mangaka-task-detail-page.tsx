import { ArrowLeft, CalendarClock, FileText, User } from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

import type { TaskResDtoOutput } from '~/api/model/task'
import { StatusBadge } from '~/shared/ui'
import { getTaskStatusTone } from './lib/task-status-meta'
import { TaskSignedImage } from './components/task-signed-image'

export function MangakaTaskDetailPage({ task, errorKey }: { task: TaskResDtoOutput | null; errorKey: string | null }) {
  const { t, i18n } = useTranslation('mangaka')

  return (
    <main className='mx-auto max-w-4xl space-y-6 pb-12'>
      <Link
        to='/dashboard/mangaka/studio'
        className='inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring'
      >
        <ArrowLeft className='size-4' aria-hidden='true' /> {t('tasks.detail.back')}
      </Link>

      {errorKey || !task ? (
        <section
          className='rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive'
          role='alert'
        >
          <h1 className='text-xl font-bold'>{t('tasks.detail.errorTitle')}</h1>
          <p className='mt-2 text-sm'>{t(errorKey ?? 'tasks.detail.errors.generic')}</p>
        </section>
      ) : (
        <section className='space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm'>
          <header className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <p className='text-xs font-bold uppercase tracking-[0.18em] text-primary'>{t('tasks.detail.eyebrow')}</p>
              <h1 className='mt-2 text-2xl font-bold text-card-foreground'>
                {task.groupTitle || task.description || t('tasks.detail.untitled')}
              </h1>
              <p className='mt-1 font-mono text-xs text-muted-foreground'>{task.id}</p>
            </div>
            <StatusBadge tone={getTaskStatusTone(task.status)}>{t(`tasks.status.${task.status}`)}</StatusBadge>
          </header>

          <dl className='grid gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-4'>
            <Detail
              label={t('tasks.detail.type')}
              value={task.taskType ? t(`tasks.composer.taskTypeEnum.${task.taskType}`) : t('tasks.detail.none')}
            />
            <Detail label={t('tasks.detail.priority')} value={String(task.priority)} />
            <Detail
              label={t('tasks.detail.assistant')}
              value={task.assistant?.displayName ?? t('tasks.detail.unassigned')}
              icon={<User className='size-4' aria-hidden='true' />}
            />
            <Detail
              label={t('tasks.detail.deadline')}
              value={task.deadline ? new Date(task.deadline).toLocaleString(i18n.language) : t('tasks.detail.none')}
              icon={<CalendarClock className='size-4' aria-hidden='true' />}
            />
          </dl>

          {task.statusReason && (
            <div className='rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning'>
              <strong>{t('tasks.detail.statusReason')}:</strong> {task.statusReason}
            </div>
          )}

          <div className='grid gap-5 md:grid-cols-2'>
            <div>
              <h2 className='mb-2 flex items-center gap-2 font-semibold text-foreground'>
                <FileText className='size-4' aria-hidden='true' /> {t('tasks.detail.source')}
              </h2>
              <TaskSignedImage
                taskId={task.id}
                r2Key={task.stageInputFile ?? task.pageOriginalFile}
                alt={t('tasks.detail.sourceAlt')}
                aspectClassName='aspect-[3/4]'
              />
            </div>
            <div>
              <h2 className='mb-2 font-semibold text-foreground'>{t('tasks.detail.latestSubmission')}</h2>
              <TaskSignedImage
                taskId={task.id}
                r2Key={task.versions.at(-1)?.file}
                alt={t('tasks.detail.submissionAlt')}
                aspectClassName='aspect-[3/4]'
              />
            </div>
          </div>

          <p className='text-sm text-muted-foreground'>
            {t('tasks.detail.summary', { regions: task.regionIds.length, versions: task.versions.length })}
          </p>
        </section>
      )}
    </main>
  )
}

function Detail({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div>
      <dt className='flex items-center gap-1 text-xs font-semibold text-muted-foreground'>
        {icon}
        {label}
      </dt>
      <dd className='mt-1 font-semibold text-foreground'>{value}</dd>
    </div>
  )
}
