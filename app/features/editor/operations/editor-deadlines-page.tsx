import { CalendarRange } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DeadlineRequestListResDtoOutputItemsItem } from '~/api/model/deadline-requests'
import {
  OperationAction,
  OperationFeedback,
  OperationPanel,
  OperationsLayout,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

export function EditorDeadlinesPage({
  items,
  focusChapterId,
  hasError
}: {
  items: DeadlineRequestListResDtoOutputItemsItem[]
  focusChapterId: string
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  return (
    <OperationsLayout
      titleKey='operations.deadlines'
      descriptionKey='operations.descriptions.deadlines'
      hasError={hasError}
    >
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <form method='get' className='grid gap-3 sm:grid-cols-[1fr_auto]'>
          <input name='chapterId' defaultValue={focusChapterId} className={operationInput} placeholder='Chapter ID' />
          <button className='rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
            {t('actions.load')}
          </button>
        </form>
        <div className='mt-4 space-y-2'>
          {items.map((item) => (
            <article key={item.id} className='rounded-lg border border-border p-3 text-sm'>
              <div className='flex justify-between'>
                <strong>{item.status.replaceAll('_', ' ')}</strong>
                <span>{item.requestedBy ?? '—'}</span>
              </div>
              <p className='mt-1 text-muted-foreground'>
                {item.requestedDeadline ? new Date(item.requestedDeadline).toLocaleString() : '—'} ·{' '}
                {item.reason ?? '—'}
              </p>
              <p className='mt-1 break-all text-xs text-muted-foreground'>{item.id}</p>
            </article>
          ))}
        </div>
      </section>
      <OperationPanel icon={CalendarRange} title={t('operations.deadlines')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <input name='chapterId' className={operationInput} placeholder='Chapter ID' />
          <input name='requestId' className={operationInput} placeholder='Deadline request ID' />
          <input name='deadline' type='datetime-local' className={operationInput} />
          <input name='reason' className={operationInput} placeholder={t('operations.reason')} />
          <div className='grid grid-cols-2 gap-2'>
            <OperationAction intent='createDeadline' label={t('actions.createRequest')} />
            <OperationAction intent='counterDeadline' label={t('actions.counter')} />
            <OperationAction intent='agreeDeadline' label={t('actions.agree')} />
            <OperationAction intent='finalizeDeadline' label={t('actions.finalize')} />
            <OperationAction intent='rejectDeadline' label={t('actions.reject')} destructive />
            <OperationAction intent='withdrawDeadline' label={t('actions.withdraw')} />
          </div>
        </fetcher.Form>
        <OperationFeedback data={fetcher.data} />
      </OperationPanel>
    </OperationsLayout>
  )
}
