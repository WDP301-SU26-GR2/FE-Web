import { Award, BookOpen, Eye, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { MangakaDirectoryListResDtoOutputItemsItem } from '~/api/model/users'
import { SignedImage } from '~/shared/components/signed-image'
import { Button } from '~/shared/ui'

export type MangakaPeerCardProps = {
  mangaka: MangakaDirectoryListResDtoOutputItemsItem
  onViewDetails: (mangaka: MangakaDirectoryListResDtoOutputItemsItem) => void
}

export function MangakaPeerCard({ mangaka, onViewDetails }: MangakaPeerCardProps) {
  const { t } = useTranslation('mangaka')
  const name = mangaka.penName || mangaka.displayName || t('mangakaDirectory.card.unnamed')

  return (
    <article className='flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md'>
      <header className='flex items-start gap-3'>
        <SignedImage
          r2Key={mangaka.avatar}
          alt={name}
          aspectClassName='aspect-square'
          className='h-14 w-14 shrink-0 rounded-full'
        />
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-1.5'>
            <h2 className='truncate text-base font-bold text-foreground'>{name}</h2>
            {mangaka.isRecommended && (
              <span className='inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning'>
                <Award className='h-3 w-3' />
                {t('mangakaDirectory.card.recommended')}
              </span>
            )}
          </div>
          {mangaka.displayName && mangaka.displayName !== mangaka.penName && (
            <p className='truncate text-xs text-muted-foreground'>{mangaka.displayName}</p>
          )}
          <p className='mt-1 text-xs font-medium text-primary'>
            {mangaka.experienceLevel ?? t('mangakaDirectory.card.levelUnknown')}
          </p>
        </div>
      </header>

      <div className='flex flex-wrap gap-2 text-xs'>
        <span className='inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-secondary-foreground'>
          <Star className='h-3.5 w-3.5 fill-current text-warning' />
          {t('mangakaDirectory.card.rating', {
            average: mangaka.ratingAvg.toFixed(1),
            count: mangaka.ratingCount
          })}
        </span>
        <span className='inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-secondary-foreground'>
          {t('mangakaDirectory.card.reputation', { score: mangaka.reputationScore.toFixed(1) })}
        </span>
      </div>

      {mangaka.genres.length > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          {mangaka.genres.slice(0, 4).map((genre) => (
            <span
              key={genre}
              className='rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground'
            >
              {t(`mangakaDirectory.genres.${genre}`)}
            </span>
          ))}
          {mangaka.genres.length > 4 && (
            <span className='rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground'>
              +{mangaka.genres.length - 4}
            </span>
          )}
        </div>
      )}

      <p className='line-clamp-3 text-sm leading-relaxed text-muted-foreground'>
        {mangaka.bio || t('mangakaDirectory.card.bioEmpty')}
      </p>

      <footer className='mt-auto flex items-center justify-between gap-3 border-t border-border pt-3'>
        <span className='inline-flex items-center gap-1.5 text-xs text-muted-foreground'>
          <BookOpen className='h-3.5 w-3.5' />
          {t('mangakaDirectory.card.portfolioCount', { count: mangaka.portfolioFiles.length })}
        </span>
        <Button type='button' variant='outline' size='sm' onClick={() => onViewDetails(mangaka)}>
          <Eye className='h-3.5 w-3.5' />
          {t('mangakaDirectory.actions.viewProfile')}
        </Button>
      </footer>
    </article>
  )
}
