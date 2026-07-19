import { Link, useFetcher } from 'react-router'
import { BookOpen, Inbox, Loader2, LockKeyhole, Unlock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'

import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import type { EditorActionResult } from '../types'

export function EditorProposalsPage({
  items,
  hasError
}: {
  items: SeriesListResDtoOutputItemsItem[]
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const statuses = [...new Set(items.map((item) => item.proposal?.status ?? item.status))]
  const filteredItems = items.filter((item) =>
    (!search || `${item.title} ${item.proposal?.synopsis ?? ''}`.toLowerCase().includes(search.toLowerCase())) &&
    (!status || (item.proposal?.status ?? item.status) === status)
  )
  return (
    <div className='space-y-6 pb-12'>
      <header>
        <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Inbox className='size-4' />
          {t('proposals.eyebrow')}
        </div>
        <h1 className='mt-2 text-2xl font-bold text-foreground md:text-3xl'>{t('proposals.title')}</h1>
        <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground'>{t('proposals.subtitle')}</p>
      </header>
      {hasError && <ErrorBanner />}
      <div className='grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-2'>
        <input className={filterInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('filters.searchProposals')} />
        <select className={filterInput} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value=''>{t('filters.allProposalStatuses')}</option>
          {statuses.map((value) => <option key={value} value={value}>{t(`filters.proposalStatuses.${value}`, { defaultValue: value })}</option>)}
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
    </div>
  )
}

const filterInput = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary'

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
        <h2 className='text-lg font-bold text-foreground'>{title}</h2>
        <span className='rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground'>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className='rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground'>
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
        <div>
          <span className='inline-flex rounded-full bg-secondary px-2.5 py-1 text-[11px] font-extrabold text-secondary-foreground'>
            {item.proposal?.status
              ? t(`filters.proposalStatuses.${item.proposal.status}`)
              : t(`filters.seriesStatuses.${item.status}`)}
          </span>
          <h3 className='mt-3 text-lg font-bold text-foreground'>{item.title}</h3>
          <p className='mt-1 text-xs text-muted-foreground'>
            {t('proposals.submittedAt', {
              date: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(item.createdAt))
            })}
          </p>
        </div>
        <span className='rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground'>
          {item.demographic ?? t('common.notAvailable')}
        </span>
      </div>
      <p className='mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground'>
        {item.proposal?.synopsis || t('proposals.noSynopsis')}
      </p>
      <div className='mt-4 flex flex-wrap gap-2'>
        {item.genres.map((genre) => (
          <span
            key={genre}
            className='rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground'
          >
            {genre}
          </span>
        ))}
      </div>
      {fetcher.data && (
        <p className={`mt-4 text-xs font-semibold ${fetcher.data.ok ? 'text-primary' : 'text-destructive'}`}>
          {fetcher.data.ok
            ? t(`messages.${fetcher.data.messageKey}`)
            : t(`errors.${fetcher.data.errorKey ?? 'actionFailed'}`)}
        </p>
      )}
      <div className='mt-5 flex flex-wrap gap-2 border-t border-border pt-4'>
        {item.editorId ? (
          <Link
            to={`/dashboard/editor/proposals/${item.id}`}
            className='inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-bold text-foreground hover:bg-muted'
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
        {item.status === 'IN_REVIEW' && (
          <fetcher.Form method='post'>
            <input type='hidden' name='seriesId' value={item.id} />
            <input type='hidden' name='intent' value={item.editorId ? 'release' : 'claim'} />
            <button
              type='submit'
              disabled={busy || Boolean(item.editorId && item.reviewStartedAt)}
              className='inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50'
            >
              {busy ? (
                <Loader2 className='size-4 animate-spin' />
              ) : item.editorId ? (
                <Unlock className='size-4' />
              ) : (
                <LockKeyhole className='size-4' />
              )}
              {item.editorId ? t('actions.release') : t('actions.claim')}
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
      className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'
      role='alert'
    >
      <p className='font-bold'>{t('errors.loadTitle')}</p>
      <p className='mt-1 text-xs'>{t('errors.loadDescription')}</p>
    </div>
  )
}
