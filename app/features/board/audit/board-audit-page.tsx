import { Form } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { AuditLogListResDtoOutput } from '~/api/model/audit'
import { boardInput, BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'

export function BoardAuditPage({ data, hasError }: { data: AuditLogListResDtoOutput | null; hasError: boolean }) {
  const { t, i18n } = useTranslation('board')
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('audit.title')} description={t('audit.description')} />
      <Form method='get' className='grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-4'>
        <input className={boardInput} name='entityId' placeholder={t('audit.entityId')} />
        <input className={boardInput} name='actorId' placeholder={t('audit.actorId')} />
        <input className={boardInput} name='action' placeholder={t('audit.action')} />
        <button className='rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
          {t('audit.filter')}
        </button>
      </Form>
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='space-y-3'>
        {data?.items.map((item) => (
          <article key={item.id} className='rounded-xl border border-border bg-card p-4'>
            <div className='flex flex-wrap justify-between gap-3'>
              <div className='flex gap-2'>
                <StatusBadge value={item.entityType} />
                <StatusBadge value={item.action} />
              </div>
              <time className='text-xs text-muted-foreground'>
                {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
                  new Date(item.createdAt)
                )}
              </time>
            </div>
            <p className='mt-3 break-all text-sm font-bold'>{item.entityId}</p>
            <p className='mt-2 text-xs text-muted-foreground'>
              {item.fromState ?? '—'} → {item.toState ?? '—'} · {item.actorId ?? t('audit.system')}
            </p>
            {item.reason && <p className='mt-2 text-sm text-muted-foreground'>{item.reason}</p>}
          </article>
        ))}
      </div>
      {!data?.items.length && <EmptyState text={t('audit.empty')} />}
    </div>
  )
}
