import { useTranslation } from 'react-i18next'
import type { AuditLogListResDtoOutput } from '~/api/model/audit'
import { BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'

export function BoardAuditPage({ data, hasError }: { data: AuditLogListResDtoOutput | null; hasError: boolean }) {
  const { t, i18n } = useTranslation('board')
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader
        title={t('audit.title')}
        description={t('audit.description')}
        backHref='/dashboard/board/operations'
      />
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
                ? t(`audit.states.${item.fromState}`, { defaultValue: item.fromState.replaceAll('_', ' ') })
                : '—'}{' '}
              →{' '}
              {item.toState
                ? t(`audit.states.${item.toState}`, { defaultValue: item.toState.replaceAll('_', ' ') })
                : '—'}{' '}
              · {item.actorId ? t('audit.userActor') : t('audit.system')}
            </p>
            {item.reason && <p className='mt-2 text-xs text-muted-foreground'>{item.reason}</p>}
          </article>
        ))}
      </div>
      {!data?.items.length && <EmptyState text={t('audit.empty')} />}
    </div>
  )
}
