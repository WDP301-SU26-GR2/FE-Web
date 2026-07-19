import { useState } from 'react'
import { Form, Link, useFetcher, useSearchParams } from 'react-router'
import { ArrowLeft, Filter, Search, UserPlus, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AdminUserListResDtoOutput } from '~/api/model/users'
import { CreateUserDialog } from './components/create-user-dialog'
import { UserActionDialog } from './components/user-action-dialog'
import { UserTable } from './components/user-table'
import type { AdminUserActionResult, SelectedUserAction } from './types'

export interface AdminUsersPageProps {
  data: AdminUserListResDtoOutput | null
  hasError: boolean
}

export function AdminUsersPage({ data, hasError }: AdminUsersPageProps) {
  const { t } = useTranslation('admin')
  const [searchParams] = useSearchParams()
  const fetcher = useFetcher<AdminUserActionResult>()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<SelectedUserAction | null>(null)

  const includeDeleted = searchParams.get('includeDeleted') === 'true'
  const limit = data?.limit ?? 20
  const offset = data?.offset ?? 0
  const total = data?.total ?? 0
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.max(Math.ceil(total / limit), 1)

  return (
    <div className='space-y-6 pb-12'>
      <Link to='/dashboard/admin' className='inline-flex items-center gap-2 text-sm font-bold text-primary'>
        <ArrowLeft className='size-4' />
        {t('navigation.backDashboard')}
      </Link>
      <header className='flex flex-col justify-between gap-4 lg:flex-row lg:items-start'>
        <div>
          <div className='mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
            <Users className='size-4' aria-hidden='true' />
            <span>{t('users.eyebrow')}</span>
          </div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground md:text-3xl'>{t('users.title')}</h1>
          <p className='mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground'>{t('users.subtitle')}</p>
        </div>
        <button
          type='button'
          onClick={() => setIsCreateOpen(true)}
          className='inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90'
        >
          <UserPlus className='size-4' aria-hidden='true' />
          {t('users.create.button')}
        </button>
      </header>

      {fetcher.data && <ActionFeedback result={fetcher.data} />}

      {hasError && (
        <div
          className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'
          role='alert'
        >
          <p className='font-bold'>{t('users.loadError.title')}</p>
          <p className='mt-1 text-xs'>{t('users.loadError.description')}</p>
        </div>
      )}

      <Form method='get' className='rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='grid grid-cols-1 gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px_auto]'>
          <label className='relative'>
            <span className='sr-only'>{t('users.filters.search')}</span>
            <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
            <input
              name='search'
              defaultValue={searchParams.get('search') ?? ''}
              placeholder={t('users.filters.searchPlaceholder')}
              className='w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20'
            />
          </label>
          <FilterSelect
            name='roleCode'
            label={t('users.filters.role')}
            defaultValue={searchParams.get('roleCode') ?? ''}
            options={[
              ['MANGAKA', t('dashboard.roles.MANGAKA')],
              ['ASSISTANT', t('dashboard.roles.ASSISTANT')],
              ['EDITOR', t('dashboard.roles.EDITOR')],
              ['BOARD_MEMBER', t('dashboard.roles.BOARD_MEMBER')]
            ]}
          />
          <FilterSelect
            name='status'
            label={t('users.filters.status')}
            defaultValue={searchParams.get('status') ?? ''}
            options={[
              ['ACTIVE', t('dashboard.userStatuses.ACTIVE')],
              ['INACTIVE', t('dashboard.userStatuses.INACTIVE')],
              ['BLOCKED', t('dashboard.userStatuses.BLOCKED')],
              ['BANNED', t('dashboard.userStatuses.BANNED')]
            ]}
          />
          <button
            type='submit'
            className='inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-foreground px-4 py-2.5 text-sm font-bold text-background transition-opacity hover:opacity-90'
          >
            <Filter className='size-4' aria-hidden='true' />
            {t('users.filters.apply')}
          </button>
        </div>
        <label className='mt-3 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted-foreground'>
          <input
            type='checkbox'
            name='includeDeleted'
            value='true'
            defaultChecked={includeDeleted}
            className='size-4 rounded border-input accent-[var(--color-primary)]'
          />
          {t('users.filters.includeDeleted')}
        </label>
      </Form>

      <div className='flex items-center justify-between gap-4'>
        <p className='text-sm font-semibold text-foreground'>{t('users.total', { count: total })}</p>
        {includeDeleted && (
          <span className='rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground'>
            {t('users.restoreMode')}
          </span>
        )}
      </div>

      <UserTable users={data?.items ?? []} includeDeleted={includeDeleted} onAction={setSelectedAction} />

      {totalPages > 1 && (
        <nav className='flex items-center justify-between gap-4' aria-label={t('users.pagination.label')}>
          <PaginationLink
            page={currentPage - 1}
            disabled={currentPage <= 1}
            searchParams={searchParams}
            label={t('users.pagination.previous')}
          />
          <span className='text-xs font-semibold text-muted-foreground'>
            {t('users.pagination.page', { page: currentPage, totalPages })}
          </span>
          <PaginationLink
            page={currentPage + 1}
            disabled={currentPage >= totalPages}
            searchParams={searchParams}
            label={t('users.pagination.next')}
          />
        </nav>
      )}

      {isCreateOpen && <CreateUserDialog fetcher={fetcher} onClose={() => setIsCreateOpen(false)} />}
      {selectedAction && (
        <UserActionDialog selection={selectedAction} fetcher={fetcher} onClose={() => setSelectedAction(null)} />
      )}
    </div>
  )
}

interface FilterSelectProps {
  name: string
  label: string
  defaultValue: string
  options: Array<[string, string]>
}

function FilterSelect({ name, label, defaultValue, options }: FilterSelectProps) {
  return (
    <label>
      <span className='sr-only'>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20'
      >
        <option value=''>{label}</option>
        {options.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

function ActionFeedback({ result }: { result: AdminUserActionResult }) {
  const { t } = useTranslation('admin')
  return (
    <div
      className={
        result.ok
          ? 'rounded-xl border border-primary/25 bg-primary/10 p-4 text-primary'
          : 'rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive'
      }
      role='status'
    >
      <p className='text-sm font-bold'>
        {result.ok ? t(`users.messages.${result.messageKey}`) : t(`users.errors.${result.errorKey}`)}
      </p>
      {result.ok && result.temporaryPassword && (
        <div className='mt-3 rounded-lg border border-border bg-card p-3 text-foreground'>
          <p className='text-xs text-muted-foreground'>{t('users.temporaryPassword.label', { email: result.email })}</p>
          <code className='mt-1 block break-all text-base font-extrabold tracking-wider'>
            {result.temporaryPassword}
          </code>
          <p className='mt-2 text-[11px] text-muted-foreground'>{t('users.temporaryPassword.notice')}</p>
        </div>
      )}
    </div>
  )
}

interface PaginationLinkProps {
  page: number
  disabled: boolean
  searchParams: URLSearchParams
  label: string
}

function PaginationLink({ page, disabled, searchParams, label }: PaginationLinkProps) {
  const nextParams = new URLSearchParams(searchParams)
  nextParams.set('page', String(page))
  const className =
    'rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted'

  return disabled ? (
    <span className={`${className} cursor-not-allowed opacity-40`}>{label}</span>
  ) : (
    <Link to={`?${nextParams.toString()}`} className={className}>
      {label}
    </Link>
  )
}
