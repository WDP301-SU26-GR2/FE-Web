import { useTranslation } from 'react-i18next'
import { Form, Link } from 'react-router'
import { AuditControllerListEntityType, type AuditLogListResDtoOutput } from '~/api/model/audit'
import { boardInput, BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'

export function BoardAuditPage({
  data,
  filters,
  page,
  hasError
}: {
  data: AuditLogListResDtoOutput | null
  filters: { entityType: string; entityId: string; actorId: string; action: string }
  page: number
  hasError: boolean
}) {
  const { t, i18n } = useTranslation('board')
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader
        title={t('audit.title')}
        description={t('audit.description')}
        backHref='/dashboard/board/operations'
      />
      <Form
        method='get'
        replace
        preventScrollReset
        className='grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-5'
      >
        <select className={boardInput} name='entityType' defaultValue={filters.entityType}>
          <option value=''>{t('audit.allEntityTypes')}</option>
          {Object.values(AuditControllerListEntityType).map((value) => (
            <option key={value} value={value}>
              {t(`audit.entityTypes.${value}`, { defaultValue: value })}
            </option>
          ))}
        </select>
        <input
          className={boardInput}
          name='entityId'
          defaultValue={filters.entityId}
          placeholder={t('audit.entityId')}
        />
        <input className={boardInput} name='actorId' defaultValue={filters.actorId} placeholder={t('audit.actorId')} />
        <input className={boardInput} name='action' defaultValue={filters.action} placeholder={t('audit.action')} />
        <button className='h-10 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'>
          {t('audit.filter')}
        </button>
      </Form>
      {hasError && <p className='text-xs text-destructive'>{t('common.loadError')}</p>}
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
            <p className='mt-3 text-xs font-bold'>
              {t(`audit.entityTypes.${item.entityType}`, { defaultValue: t('audit.record') })}
            </p>
            <p className='mt-2 text-xs text-muted-foreground'>
              {item.fromState
                ? t([`audit.states.${item.fromState}`, `common:businessData.values.${item.fromState}`], {
                    defaultValue: t('common.notAvailable')
                  })
                : '—'}{' '}
              →{' '}
              {item.toState
                ? t([`audit.states.${item.toState}`, `common:businessData.values.${item.toState}`], {
                    defaultValue: t('common.notAvailable')
                  })
                : '—'}{' '}
              · {item.actorId ? t('audit.userActor') : t('audit.system')}
            </p>
            {item.reason && <p className='mt-2 text-xs text-muted-foreground'>{item.reason}</p>}
          </article>
        ))}
      </div>
      {!data?.items.length && <EmptyState text={t('audit.empty')} />}
      {data && data.total > data.limit && (
        <nav className='flex items-center justify-between'>
          <Link
            to={auditPageHref(filters, Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={`rounded-md border border-border px-3 py-2 text-xs font-bold ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
          >
            {t('audit.previous')}
          </Link>
          <span className='text-xs text-muted-foreground'>{t('audit.page', { page })}</span>
          <Link
            to={auditPageHref(filters, page + 1)}
            aria-disabled={page * data.limit >= data.total}
            className={`rounded-md border border-border px-3 py-2 text-xs font-bold ${page * data.limit >= data.total ? 'pointer-events-none opacity-50' : ''}`}
          >
            {t('audit.next')}
          </Link>
        </nav>
      )}
    </div>
  )
}

function auditPageHref(
  filters: { entityType: string; entityId: string; actorId: string; action: string },
  page: number
) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
  if (page > 1) params.set('page', String(page))
  return `?${params.toString()}`
}
