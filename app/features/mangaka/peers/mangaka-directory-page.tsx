import { useState, type FormEvent } from 'react'
import { Filter, Search, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  UsersControllerListMangakasGenre,
  UsersControllerListMangakasLevel,
  type MangakaDirectoryListResDtoOutputItemsItem
} from '~/api/model/users'
import { Pagination } from '~/shared/components/pagination'
import { Button } from '~/shared/ui'

import { MangakaPeerCard } from './components/mangaka-peer-card'
import { MangakaPublicProfileDialog } from './components/mangaka-public-profile-dialog'
import { useMangakaDirectory } from './use-mangaka-directory'

const GENRES = Object.values(UsersControllerListMangakasGenre)
const LEVELS = Object.values(UsersControllerListMangakasLevel)

export function MangakaDirectoryPage() {
  const { t } = useTranslation('mangaka')
  const {
    items,
    total,
    page,
    pageSize,
    genre,
    query,
    level,
    isLoading,
    error,
    setPage,
    setGenre,
    setQuery,
    setLevel,
    refresh
  } = useMangakaDirectory()
  const [queryInput, setQueryInput] = useState('')
  const [levelInput, setLevelInput] = useState<UsersControllerListMangakasLevel | ''>('')
  const [profileTarget, setProfileTarget] = useState<MangakaDirectoryListResDtoOutputItemsItem | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const hasFilters = Boolean(query || genre || level)

  const applyTextFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setQuery(queryInput.trim() || undefined)
    setLevel(levelInput || undefined)
  }

  const clearFilters = () => {
    setQueryInput('')
    setLevelInput('')
    setQuery(undefined)
    setLevel(undefined)
    setGenre(undefined)
  }

  return (
    <div className='space-y-6'>
      <header>
        <div className='flex items-center gap-2'>
          <Users className='h-5 w-5 text-primary' />
          <h1 className='text-2xl font-bold tracking-tight text-foreground'>{t('mangakaDirectory.title')}</h1>
        </div>
        <p className='mt-1 max-w-3xl text-sm text-muted-foreground'>{t('mangakaDirectory.subtitle')}</p>
      </header>

      <form
        onSubmit={applyTextFilters}
        className='grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_14rem_auto] lg:items-end'
      >
        <label className='grid gap-1.5 text-xs font-semibold text-muted-foreground'>
          <span className='inline-flex items-center gap-1.5 uppercase tracking-wide'>
            <Search className='h-3.5 w-3.5' />
            {t('mangakaDirectory.filters.search')}
          </span>
          <input
            type='search'
            value={queryInput}
            maxLength={100}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder={t('mangakaDirectory.filters.searchPlaceholder')}
            className='h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring'
          />
        </label>
        <label className='grid gap-1.5 text-xs font-semibold text-muted-foreground'>
          <span className='inline-flex items-center gap-1.5 uppercase tracking-wide'>
            <Filter className='h-3.5 w-3.5' />
            {t('mangakaDirectory.filters.level')}
          </span>
          <select
            value={levelInput}
            onChange={(event) => setLevelInput(event.target.value as UsersControllerListMangakasLevel | '')}
            className='h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring'
          >
            <option value=''>{t('mangakaDirectory.filters.allLevels')}</option>
            {LEVELS.map((option) => (
              <option key={option} value={option}>
                {t(`mangakaDirectory.filters.levels.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <div className='flex flex-wrap gap-2'>
          <Button type='submit' variant='primary'>
            <Search className='h-4 w-4' />
            {t('mangakaDirectory.actions.search')}
          </Button>
          {hasFilters && (
            <Button type='button' variant='outline' onClick={clearFilters}>
              {t('mangakaDirectory.actions.clear')}
            </Button>
          )}
        </div>
      </form>

      <section className='space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='mr-1 text-xs font-bold uppercase tracking-wide text-muted-foreground'>
            {t('mangakaDirectory.filters.genre')}
          </span>
          <button
            type='button'
            onClick={() => setGenre(undefined)}
            aria-pressed={!genre}
            className={
              !genre
                ? 'rounded-full border border-primary bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground'
                : 'rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted'
            }
          >
            {t('mangakaDirectory.filters.allGenres')}
          </button>
          {GENRES.map((option) => (
            <button
              key={option}
              type='button'
              onClick={() => setGenre(genre === option ? undefined : option)}
              aria-pressed={genre === option}
              className={
                genre === option
                  ? 'rounded-full border border-primary bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground'
                  : 'rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted'
              }
            >
              {t(`mangakaDirectory.genres.${option}`)}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div
          role='alert'
          className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'
        >
          <span>{error}</span>
          <Button type='button' variant='outline' size='sm' onClick={refresh}>
            {t('mangakaDirectory.actions.retry')}
          </Button>
        </div>
      )}

      <section className='rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5'>
        {isLoading ? (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
            {Array.from({ length: pageSize }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className='flex flex-col items-center gap-3 py-12 text-center'>
            <Users className='h-9 w-9 text-muted-foreground/40' />
            <h2 className='text-base font-semibold text-foreground'>{t('mangakaDirectory.empty.title')}</h2>
            <p className='max-w-md text-sm text-muted-foreground'>{t('mangakaDirectory.empty.description')}</p>
            {hasFilters && (
              <Button type='button' variant='outline' size='sm' onClick={clearFilters}>
                {t('mangakaDirectory.actions.clear')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
              {items.map((mangaka) => (
                <MangakaPeerCard key={mangaka.userId} mangaka={mangaka} onViewDetails={setProfileTarget} />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              from={from}
              to={to}
              total={total}
              tKeyPrefix='mangakaDirectory.pagination'
              t={t}
            />
          </>
        )}
      </section>

      <MangakaPublicProfileDialog
        mangaka={profileTarget}
        open={profileTarget !== null}
        onClose={() => setProfileTarget(null)}
      />
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className='flex min-h-72 flex-col gap-4 rounded-xl border border-border bg-card p-5' aria-hidden='true'>
      <div className='flex gap-3'>
        <div className='h-14 w-14 animate-pulse rounded-full bg-muted' />
        <div className='flex-1 space-y-2 pt-1'>
          <div className='h-4 w-2/3 animate-pulse rounded bg-muted' />
          <div className='h-3 w-1/2 animate-pulse rounded bg-muted' />
        </div>
      </div>
      <div className='flex gap-2'>
        <div className='h-6 w-24 animate-pulse rounded-full bg-muted' />
        <div className='h-6 w-20 animate-pulse rounded-full bg-muted' />
      </div>
      <div className='h-16 animate-pulse rounded bg-muted' />
      <div className='mt-auto h-9 animate-pulse rounded bg-muted' />
    </div>
  )
}
