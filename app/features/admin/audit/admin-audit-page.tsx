import { Form, Link, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, Bot, ExternalLink, Filter, Search, ShieldCheck, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AuditLogListResDtoOutput } from '~/api/model/audit'
import { KNOWN_AUDIT_ACTIONS, isKnownAuditAction } from '~/shared/lib/audit-action'

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
  'PUBLICATION_VERSION',
  'BOARD_SESSION'
] as const

export type AuditReference = {
  title: string
  subtitle?: string
  href?: string
}

type AuditReferences = {
  actors: Record<string, AuditReference>
  entities: Record<string, AuditReference>
}

export function AdminAuditPage({
  data,
  references,
  hasError
}: {
  data: AuditLogListResDtoOutput | null
  references: AuditReferences
  hasError: boolean
}) {
  const { t, i18n } = useTranslation('admin')
  const [searchParams] = useSearchParams()
  const limit = data?.limit ?? 20
  const offset = data?.offset ?? 0
  const page = Math.floor(offset / limit) + 1
  const totalPages = Math.max(Math.ceil((data?.total ?? 0) / limit), 1)

  return (
    <div className='space-y-6 pb-12'>
      <Link to='/dashboard/admin' className='inline-flex items-center gap-2 text-xs font-bold text-primary'>
        <ArrowLeft className='size-4' />
        {t('navigation.backDashboard')}
      </Link>
      <header>
        <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <ShieldCheck className='size-4' />
          {t('audit.eyebrow')}
        </div>
        <h1 className='mt-2 text-xl font-bold text-foreground md:text-2xl'>{t('audit.title')}</h1>
        <p className='mt-2 max-w-3xl text-xs leading-6 text-muted-foreground'>{t('audit.subtitle')}</p>
      </header>

      {hasError && (
        <div
          className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive'
          role='alert'
        >
          <p className='font-bold'>{t('audit.loadError.title')}</p>
          <p className='mt-1 text-xs'>{t('audit.loadError.description')}</p>
        </div>
      )}

      <Form method='get' className='rounded-2xl border border-border bg-card p-4 shadow-sm'>
        <div className='mb-4 flex items-start gap-3 border-b border-border pb-4'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <Search className='size-4' />
          </div>
          <div>
            <p className='text-sm font-bold text-foreground'>{t('audit.filters.title')}</p>
            <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>{t('audit.filters.description')}</p>
          </div>
        </div>
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'>
          <select name='entityType' defaultValue={searchParams.get('entityType') ?? ''} className={inputClassName}>
            <option value=''>{t('audit.filters.allEntities')}</option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`audit.entityTypes.${type}`, { defaultValue: t('common.notAvailable') })}
              </option>
            ))}
          </select>
          <input
            name='action'
            defaultValue={searchParams.get('action') ?? ''}
            className={inputClassName}
            placeholder={t('audit.filters.action')}
            list='audit-action-suggestions'
          />
          <datalist id='audit-action-suggestions'>
            {KNOWN_AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action} />
            ))}
          </datalist>
          <input
            name='entityId'
            defaultValue={searchParams.get('entityId') ?? ''}
            className={inputClassName}
            placeholder={t('audit.filters.entityId')}
          />
          <input
            name='actorId'
            defaultValue={searchParams.get('actorId') ?? ''}
            className={inputClassName}
            placeholder={t('audit.filters.actorId')}
          />
          <button
            type='submit'
            className='inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-xs font-bold text-background'
          >
            <Filter className='size-4' />
            {t('audit.filters.apply')}
          </button>
        </div>
      </Form>

      <div className='flex flex-wrap items-center justify-between gap-4'>
        <p className='text-xs font-bold text-foreground'>{t('audit.total', { count: data?.total ?? 0 })}</p>
      </div>

      {(data?.items.length ?? 0) === 0 ? (
        <div className='rounded-xl border border-dashed border-border bg-card p-10 text-center text-xs text-muted-foreground'>
          {t('audit.empty')}
        </div>
      ) : (
        <div className='space-y-3'>
          {data?.items.map((item) => (
            <article
              key={item.id}
              className='overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md'
            >
              <div className='h-1 bg-primary/70' />
              <div className='p-4 md:p-5'>
                <div className='flex flex-col justify-between gap-3 md:flex-row md:items-start'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-extrabold text-primary'>
                        {t(`audit.actions.${item.action}`, { defaultValue: isKnownAuditAction(item.action) ? item.action : t('audit.actions.unknown') })}
                      </span>
                      <span className='rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground'>
                        {t(`audit.entityTypes.${item.entityType}`, {
                          defaultValue: t('common.notAvailable')
                        })}
                      </span>
                    </div>
                    <div className='mt-4 grid gap-3 lg:grid-cols-2'>
                      <ReferenceCard
                        icon={ShieldCheck}
                        label={t('audit.record')}
                        reference={references.entities[`${item.entityType}:${item.entityId}`]}
                        id={item.entityId}
                        fallback={t(`audit.entityTypes.${item.entityType}`, {
                          defaultValue: t('common.notAvailable')
                        })}
                        openLabel={t('audit.openRecord')}
                      />
                      <ReferenceCard
                        icon={item.actorId ? UserRound : Bot}
                        label={t('audit.userActor')}
                        reference={item.actorId ? references.actors[item.actorId] : undefined}
                        id={item.actorId}
                        fallback={t('audit.systemActor')}
                        openLabel={t('audit.openActor')}
                      />
                    </div>
                  </div>
                  <time className='shrink-0 text-xs font-semibold text-muted-foreground'>
                    {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
                      new Date(item.createdAt)
                    )}
                  </time>
                </div>
                {(item.fromState || item.toState) && (
                  <div className='mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs font-bold text-foreground'>
                    <span>
                      {item.fromState
                        ? t(`audit.states.${item.fromState}`, { defaultValue: t('common.notAvailable') })
                        : ''}
                    </span>
                    <ArrowRight className='size-3.5 text-primary' />
                    <span>
                      {item.toState
                        ? t(`audit.states.${item.toState}`, { defaultValue: t('common.notAvailable') })
                        : ''}
                    </span>
                  </div>
                )}
                {item.reason && (
                  <div className='mt-3 rounded-xl border border-border bg-background/70 px-3 py-2.5'>
                    <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                      {t('audit.reason')}
                    </p>
                    <p className='mt-1 text-xs leading-6 text-foreground'>{item.reason}</p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className='flex flex-wrap items-center justify-between gap-4' aria-label={t('audit.pagination.label')}>
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

function ReferenceCard({
  icon: Icon,
  label,
  reference,
  id,
  fallback,
  openLabel
}: {
  icon: typeof ShieldCheck
  label: string
  reference?: AuditReference
  id: string | null
  fallback: string
  openLabel: string
}) {
  const { t } = useTranslation('admin')
  const content = (
    <>
      <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
        <Icon className='size-4' />
      </div>
      <div className='min-w-0 flex-1'>
        <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>{label}</p>
        <p className='mt-0.5 truncate text-xs font-bold text-foreground'>{reference?.title || fallback}</p>
        {reference?.subtitle && (
          <p className='mt-0.5 truncate text-[11px] text-muted-foreground'>
            {t(`audit.states.${reference.subtitle}`, {
              defaultValue: t('common.notAvailable')
            })}
          </p>
        )}
        {id && (
          <code className='mt-1 block text-[10px] text-muted-foreground' title={id}>
            {shortId(id)}
          </code>
        )}
      </div>
      {reference?.href && <ExternalLink className='size-3.5 shrink-0 text-primary' aria-label={openLabel} />}
    </>
  )

  const className =
    'flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background/70 p-3 text-left transition-colors'
  return reference?.href ? (
    <Link to={reference.href} className={`${className} hover:border-primary/40 hover:bg-primary/5`} title={openLabel}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 6)}${id.slice(-4)}` : id
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
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20'

