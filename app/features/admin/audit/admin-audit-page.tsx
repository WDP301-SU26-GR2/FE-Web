import { Form, Link, useSearchParams } from 'react-router'
import { Activity, ArrowLeft, ArrowRight, Filter, Search, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AuditLogListResDtoOutput } from '~/api/model/audit'

const ENTITY_TYPES = [
  'SERIES',
  'MANUSCRIPT',
  'PAGE',
  'CHAPTER',
  'TASK',
  'DEADLINE_REQUEST',
  'USER',
  'REGION',
  'APP_CONFIG',
  'CONTRACT',
  'BOARD_DECISION',
  'REPRINT_REQUEST',
  'TRANSFER_REQUEST',
  'PAYMENT_RECORD',
  'SURVEY_PERIOD',
  'PUBLICATION_VERSION'
] as const

export function AdminAuditPage({ data, hasError }: { data: AuditLogListResDtoOutput | null; hasError: boolean }) {
  const { t, i18n } = useTranslation('admin')
  const [searchParams] = useSearchParams()
  const limit = data?.limit ?? 20
  const offset = data?.offset ?? 0
  const page = Math.floor(offset / limit) + 1
  const totalPages = Math.max(Math.ceil((data?.total ?? 0) / limit), 1)

  return (
    <div className='space-y-6 pb-12'>
      <Link to='/dashboard/admin' className='inline-flex items-center gap-2 text-sm font-bold text-primary'>
        <ArrowLeft className='size-4' />
        {t('navigation.backDashboard')}
      </Link>
      <header>
        <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <ShieldCheck className='size-4' />
          {t('audit.eyebrow')}
        </div>
        <h1 className='mt-2 text-2xl font-bold text-foreground md:text-3xl'>{t('audit.title')}</h1>
        <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground'>{t('audit.subtitle')}</p>
      </header>

      {hasError && (
        <div
          className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'
          role='alert'
        >
          <p className='font-bold'>{t('audit.loadError.title')}</p>
          <p className='mt-1 text-xs'>{t('audit.loadError.description')}</p>
        </div>
      )}

      <Form method='get' className='rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-[200px_1fr_1fr_1fr_auto]'>
          <select name='entityType' defaultValue={searchParams.get('entityType') ?? ''} className={inputClassName}>
            <option value=''>{t('audit.filters.allEntities')}</option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          <FilterInput
            icon={Activity}
            name='action'
            value={searchParams.get('action') ?? ''}
            placeholder={t('audit.filters.action')}
          />
          <FilterInput
            icon={Search}
            name='entityId'
            value={searchParams.get('entityId') ?? ''}
            placeholder={t('audit.filters.entityId')}
          />
          <FilterInput
            icon={Search}
            name='actorId'
            value={searchParams.get('actorId') ?? ''}
            placeholder={t('audit.filters.actorId')}
          />
          <button
            type='submit'
            className='inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-bold text-background'
          >
            <Filter className='size-4' />
            {t('audit.filters.apply')}
          </button>
        </div>
      </Form>

      <div className='flex items-center justify-between gap-4'>
        <p className='text-sm font-bold text-foreground'>{t('audit.total', { count: data?.total ?? 0 })}</p>
      </div>

      {(data?.items.length ?? 0) === 0 ? (
        <div className='rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground'>
          {t('audit.empty')}
        </div>
      ) : (
        <div className='space-y-3'>
          {data?.items.map((item) => (
            <article key={item.id} className='rounded-xl border border-border bg-card p-4 shadow-sm'>
              <div className='flex flex-col justify-between gap-3 md:flex-row md:items-start'>
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-extrabold text-primary'>
                      {item.action.replaceAll('_', ' ')}
                    </span>
                    <span className='rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground'>
                      {item.entityType.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <p className='mt-3 break-all text-sm font-bold text-foreground'>{item.entityId}</p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {item.actorId ? t('audit.actor', { id: item.actorId }) : t('audit.systemActor')}
                  </p>
                </div>
                <time className='shrink-0 text-xs font-semibold text-muted-foreground'>
                  {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
                    new Date(item.createdAt)
                  )}
                </time>
              </div>
              {(item.fromState || item.toState) && (
                <div className='mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-bold text-foreground'>
                  <span>{item.fromState ?? '—'}</span>
                  <ArrowRight className='size-3.5 text-primary' />
                  <span>{item.toState ?? '—'}</span>
                </div>
              )}
              {item.reason && <p className='mt-3 text-sm leading-6 text-muted-foreground'>{item.reason}</p>}
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className='flex items-center justify-between gap-4' aria-label={t('audit.pagination.label')}>
          <PageLink page={page - 1} disabled={page <= 1} params={searchParams} label={t('audit.pagination.previous')} />
          <span className='text-xs font-bold text-muted-foreground'>
            {t('audit.pagination.page', { page, totalPages })}
          </span>
          <PageLink
            page={page + 1}
            disabled={page >= totalPages}
            params={searchParams}
            label={t('audit.pagination.next')}
          />
        </nav>
      )}
    </div>
  )
}

function FilterInput({
  icon: Icon,
  name,
  value,
  placeholder
}: {
  icon: typeof Search
  name: string
  value: string
  placeholder: string
}) {
  return (
    <label className='relative'>
      <span className='sr-only'>{placeholder}</span>
      <Icon className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
      <input name={name} defaultValue={value} placeholder={placeholder} className={`${inputClassName} pl-9`} />
    </label>
  )
}

function PageLink({
  page,
  disabled,
  params,
  label
}: {
  page: number
  disabled: boolean
  params: URLSearchParams
  label: string
}) {
  const next = new URLSearchParams(params)
  next.set('page', String(page))
  const className = 'rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold text-foreground'
  return disabled ? (
    <span className={`${className} opacity-40`}>{label}</span>
  ) : (
    <Link to={`?${next.toString()}`} className={className}>
      {label}
    </Link>
  )
}

const inputClassName =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20'
