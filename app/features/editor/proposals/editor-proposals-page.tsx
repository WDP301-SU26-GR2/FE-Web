import { Link, useFetcher } from 'react-router'
import { BookOpen, Inbox, Loader2, LockKeyhole } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SemanticStatusBadge } from '~/shared/components/status-badge'
import { useState } from 'react'

import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import type { EditorActionResult } from '../types'
import { EditorActionToast } from '../components/editor-action-toast'
import { EDITOR_PROPOSAL_INTENTS, EDITOR_PROPOSAL_ROUTES } from './proposal-review'

export function EditorProposalsPage({
  items,
  total,
  limit,
  offset,
  hasError
}: {
  items: SeriesListResDtoOutputItemsItem[]
  total: number
  limit: number
  offset: number
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const statuses = [...new Set(items.map((item) => item.status))]
  const filteredItems = items.filter(
    (item) =>
      (!search || item.title.toLowerCase().includes(search.toLowerCase())) && (!status || item.status === status)
  )
  return (
    <div className='space-y-6 pb-12'>
      <header>
        <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Inbox className='size-4' />
          {t('proposals.eyebrow')}
        </div>
        <h1 className='mt-2 text-xl font-bold text-foreground md:text-2xl'>{t('proposals.title')}</h1>
        <p className='mt-2 max-w-3xl text-xs leading-6 text-muted-foreground'>{t('proposals.subtitle')}</p>
      </header>
      {hasError && <ErrorBanner />}
      <div className='grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-2'>
        <input
          className={filterInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('filters.searchProposals')}
        />
        <select className={filterInput} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value=''>{t('filters.allSeriesStatuses')}</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {t(`filters.seriesStatuses.${value}`, { defaultValue: t('common.notAvailable') })}
            </option>
          ))}
        </select>
      </div>
      <ProposalSection
        title={t('proposals.queue')}
        items={filteredItems.filter((item) => item.status === 'IN_REVIEW' && !item.editorId)}
        empty={t('proposals.emptyQueue')}
      />
      <ProposalSection
        title={t('proposals.assigned')}
        items={filteredItems.filter((item) => item.editorId)}
        empty={t('proposals.emptyAssigned')}
      />
      <nav
        className='flex items-center justify-between gap-3 border-t border-border pt-4'
        aria-label={t('pagination.label')}
      >
        <Link
          to={EDITOR_PROPOSAL_ROUTES.listPage(Math.max(0, offset - limit))}
          aria-disabled={offset === 0}
          className={`inline-flex h-9 items-center rounded-md border border-border px-3 text-xs font-bold text-foreground ${
            offset === 0 ? 'pointer-events-none opacity-50' : 'hover:bg-muted'
          }`}
        >
          {t('pagination.previous')}
        </Link>
        <span className='text-xs text-muted-foreground'>
          {t('pagination.summary', {
            from: total ? offset + 1 : 0,
            to: Math.min(offset + items.length, total),
            total
          })}
        </span>
        <Link
          to={EDITOR_PROPOSAL_ROUTES.listPage(offset + limit)}
          aria-disabled={offset + items.length >= total}
          className={`inline-flex h-9 items-center rounded-md border border-border px-3 text-xs font-bold text-foreground ${
            offset + items.length >= total ? 'pointer-events-none opacity-50' : 'hover:bg-muted'
          }`}
        >
          {t('pagination.next')}
        </Link>
      </nav>
    </div>
  )
}

const filterInput =
  'h-10 min-w-0 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary'

function ProposalSection({
  title,
  items,
  empty
}: {
  title: string
  items: SeriesListResDtoOutputItemsItem[]
  empty: string
}) {
  return (
    <section className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h2 className='text-base font-bold text-foreground'>{title}</h2>
        <span className='rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground'>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className='rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground'>
          {empty}
        </div>
      ) : (
        <div className='grid gap-4 xl:grid-cols-2'>
          {items.map((item) => (
            <ProposalCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}

function ProposalCard({ item }: { item: SeriesListResDtoOutputItemsItem }) {
  const { t, i18n } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const busy = fetcher.state !== 'idle'

  return (
    <article className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <SemanticStatusBadge value={item.status} label={t(`filters.seriesStatuses.${item.status}`)} />
          <h3 className='mt-3 text-pretty text-base font-bold leading-6 text-foreground'>{item.title}</h3>
          <p className='mt-1 text-xs text-muted-foreground'>
            {t('proposals.submittedAt', {
              date: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(item.createdAt))
            })}
          </p>
        </div>
        <span className='rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground'>
          {item.demographic
            ? t(`common:businessData.values.${item.demographic}`, { defaultValue: t('common.notAvailable') })
            : t('common.notAvailable')}
        </span>
      </div>
      <div className='mt-4 flex flex-wrap gap-2'>
        {item.genres.map((genre) => (
          <span
            key={genre}
            className='rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground'
          >
            {t(`common:businessData.values.${genre}`, { defaultValue: t('common.notAvailable') })}
          </span>
        ))}
      </div>
      <EditorActionToast data={fetcher.data} scope={`editor-proposal-${item.id}`} />
      <div className='mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:flex-wrap'>
        {item.editorId ? (
          <Link
            to={EDITOR_PROPOSAL_ROUTES.detail(item.id)}
            className='inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border px-3 text-xs font-bold text-foreground hover:bg-muted sm:w-auto'
          >
            <BookOpen className='size-4' />
            {t('actions.review')}
          </Link>
        ) : (
          <span className='inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground'>
            <LockKeyhole className='size-4' />
            {t('proposals.claimToReview')}
          </span>
        )}
        {item.status === 'IN_REVIEW' && !item.editorId && (
          <fetcher.Form method='post'>
            <input type='hidden' name='seriesId' value={item.id} />
            <input type='hidden' name='intent' value={EDITOR_PROPOSAL_INTENTS.claim} />
            <button
              type='submit'
              disabled={busy}
              className='inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto'
            >
              {busy ? <Loader2 className='size-4 animate-spin' /> : <LockKeyhole className='size-4' />}
              {t('actions.claim')}
            </button>
          </fetcher.Form>
        )}
      </div>
    </article>
  )
}

function ErrorBanner() {
  const { t } = useTranslation('editor')
  return (
    <div
      className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive'
      role='alert'
    >
      <p className='font-bold'>{t('errors.loadTitle')}</p>
      <p className='mt-1 text-xs'>{t('errors.loadDescription')}</p>
    </div>
  )
}
