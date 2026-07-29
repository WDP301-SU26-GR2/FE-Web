import { Award, CalendarDays, RefreshCw, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { ReviewListResDtoOutputItemsItem } from '~/api/model/reviews'
import type { AssistantDirectoryListResDtoOutputItemsItem, AssistantProfileResDtoOutput } from '~/api/model/users'
import { SignedImage } from '~/shared/components/signed-image'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { cn } from '~/shared/lib/cn'
import { Button, Dialog } from '~/shared/ui'

import { useAssistantPublicProfile } from '../use-assistant-public-profile'

export type AssistantPublicProfileDialogProps = {
  assistant: AssistantDirectoryListResDtoOutputItemsItem | null
  open: boolean
  onClose: () => void
}

const AVAILABILITY_CLASS: Record<string, string> = {
  AVAILABLE: 'border-success/30 bg-success/10 text-success',
  BUSY: 'border-warning/30 bg-warning/10 text-warning',
  ON_LEAVE: 'border-border bg-muted text-muted-foreground',
  UNAVAILABLE: 'border-border bg-muted text-muted-foreground'
}

export function AssistantPublicProfileDialog({ assistant, open, onClose }: AssistantPublicProfileDialogProps) {
  const { t, i18n } = useTranslation('mangaka')
  const { profile, reviews, isLoading, error, retry } = useAssistantPublicProfile(
    open ? (assistant?.userId ?? null) : null
  )
  const displayName = profile?.displayName ?? assistant?.displayName ?? t('assistantDirectory.card.unnamedAssistant')

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size='xl'
      titleId='assistant-public-profile-title'
      descriptionId='assistant-public-profile-description'
      title={t('assistantDirectory.profile.title', { name: displayName })}
      description={t('assistantDirectory.profile.description')}
      footer={
        <div className='flex justify-end'>
          <Button type='button' variant='outline' size='sm' onClick={onClose}>
            {t('assistantDirectory.profile.close')}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <ProfileSkeleton />
      ) : error || !profile ? (
        <div className='flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-5 py-8 text-center'>
          <p role='alert' className='text-sm font-medium text-destructive'>
            {extractApiErrorMessage(error, t('assistantDirectory.profile.loadFailed'))}
          </p>
          <Button type='button' variant='outline' size='sm' onClick={retry}>
            <RefreshCw className='h-4 w-4' />
            {t('assistantDirectory.profile.retry')}
          </Button>
        </div>
      ) : (
        <ProfileContent profile={profile} reviews={reviews} locale={i18n.language} />
      )}
    </Dialog>
  )
}

function ProfileContent({
  profile,
  reviews,
  locale
}: {
  profile: AssistantProfileResDtoOutput
  reviews: ReviewListResDtoOutputItemsItem[]
  locale: string
}) {
  const { t } = useTranslation('mangaka')
  const availabilityClass =
    AVAILABILITY_CLASS[profile.availabilityStatus ?? 'UNAVAILABLE'] ?? AVAILABILITY_CLASS.UNAVAILABLE

  return (
    <div className='space-y-6'>
      <section className='flex flex-col gap-4 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center'>
        <SignedImage
          r2Key={profile.avatar}
          alt={profile.displayName ?? t('assistantDirectory.card.unnamedAssistant')}
          aspectClassName='aspect-square'
          className='h-20 w-20 shrink-0 rounded-full'
        />
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='text-xl font-bold text-foreground'>
              {profile.displayName ?? t('assistantDirectory.card.unnamedAssistant')}
            </h3>
            {profile.isRecommended && (
              <span className='inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning'>
                <Award className='h-3.5 w-3.5' />
                {t('assistantDirectory.card.recommended')}
              </span>
            )}
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>
            {profile.experienceLevel ?? t('assistantDirectory.profile.notProvided')}
          </p>
          <div className='mt-3 flex flex-wrap gap-2'>
            <Metric label={t('assistantDirectory.profile.reputation')} value={profile.reputationScore.toFixed(1)} />
            <Metric
              label={t('assistantDirectory.profile.rating')}
              value={t('assistantDirectory.profile.ratingValue', {
                average: profile.ratingAvg.toFixed(1),
                count: profile.ratingCount
              })}
              icon={<Star className='h-3.5 w-3.5 text-warning' />}
            />
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                availabilityClass
              )}
            >
              {t(`assistantDirectory.card.availability.${profile.availabilityStatus ?? 'UNAVAILABLE'}`)}
            </span>
          </div>
        </div>
      </section>

      {!profile.hasProfile && (
        <p className='rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground'>
          {t('assistantDirectory.profile.incomplete')}
        </p>
      )}

      <section className='space-y-3'>
        <h4 className='text-sm font-bold uppercase tracking-wide text-muted-foreground'>
          {t('assistantDirectory.profile.specializations')}
        </h4>
        {profile.specializations.length > 0 ? (
          <div className='flex flex-wrap gap-2'>
            {profile.specializations.map((specialization) => (
              <span
                key={specialization}
                className='rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground'
              >
                {t(`assistantDirectory.card.specialization.${specialization}`)}
              </span>
            ))}
          </div>
        ) : (
          <p className='text-sm text-muted-foreground'>{t('assistantDirectory.profile.emptySpecializations')}</p>
        )}
        {(profile.availabilityFrom || profile.availabilityTo) && (
          <p className='inline-flex items-center gap-2 text-sm text-muted-foreground'>
            <CalendarDays className='h-4 w-4' />
            {t('assistantDirectory.profile.availableWindow', {
              from: formatDate(profile.availabilityFrom, locale),
              to: formatDate(profile.availabilityTo, locale)
            })}
          </p>
        )}
      </section>

      <section className='space-y-3'>
        <div>
          <h4 className='text-sm font-bold uppercase tracking-wide text-muted-foreground'>
            {t('assistantDirectory.profile.portfolio')}
          </h4>
          <p className='mt-1 text-xs text-muted-foreground'>
            {t('assistantDirectory.profile.portfolioCount', { count: profile.portfolioFiles.length })}
          </p>
        </div>
        {profile.portfolioFiles.length > 0 ? (
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
            {profile.portfolioFiles.map((key, index) => (
              <SignedImage
                key={key}
                r2Key={key}
                alt={t('assistantDirectory.profile.portfolioAlt', { index: index + 1 })}
                aspectClassName='aspect-square'
              />
            ))}
          </div>
        ) : (
          <p className='rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground'>
            {t('assistantDirectory.profile.emptyPortfolio')}
          </p>
        )}
      </section>

      <section className='space-y-3'>
        <div>
          <h4 className='text-sm font-bold uppercase tracking-wide text-muted-foreground'>
            {t('assistantDirectory.profile.reviews')}
          </h4>
          <p className='mt-1 text-xs text-muted-foreground'>{t('assistantDirectory.profile.reviewsHint')}</p>
        </div>
        {reviews.length > 0 ? (
          <div className='space-y-3'>
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} locale={locale} />
            ))}
          </div>
        ) : (
          <p className='rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground'>
            {t('assistantDirectory.profile.emptyReviews')}
          </p>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <span className='inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-secondary-foreground'>
      {icon}
      <strong>{value}</strong>
      <span className='text-muted-foreground'>{label}</span>
    </span>
  )
}

function ReviewCard({ review, locale }: { review: ReviewListResDtoOutputItemsItem; locale: string }) {
  const { t } = useTranslation('mangaka')
  const reviewerName = review.reviewer?.displayName ?? t('assistantDirectory.profile.anonymousReviewer')

  return (
    <article className='rounded-lg border border-border bg-background p-4'>
      <div className='flex items-start gap-3'>
        <SignedImage
          r2Key={review.reviewer?.avatar}
          alt={reviewerName}
          aspectClassName='aspect-square'
          className='h-9 w-9 shrink-0 rounded-full'
        />
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <span className='text-sm font-semibold text-foreground'>{reviewerName}</span>
            <span className='text-xs text-muted-foreground'>{formatDate(review.createdAt, locale)}</span>
          </div>
          <div className='mt-1 flex items-center gap-1 text-sm font-semibold text-foreground'>
            <Star className='h-3.5 w-3.5 fill-current text-warning' />
            {review.rating.toFixed(1)}
          </div>
          <p className='mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground'>
            {review.comment || t('assistantDirectory.profile.noComment')}
          </p>
        </div>
      </div>
    </article>
  )
}

function ProfileSkeleton() {
  return (
    <div className='space-y-5' aria-busy='true'>
      <div className='flex gap-4 rounded-lg border border-border p-4'>
        <div className='h-20 w-20 animate-pulse rounded-full bg-muted' />
        <div className='flex-1 space-y-3 py-1'>
          <div className='h-5 w-1/2 animate-pulse rounded bg-muted' />
          <div className='h-3 w-1/3 animate-pulse rounded bg-muted' />
          <div className='h-6 w-2/3 animate-pulse rounded bg-muted' />
        </div>
      </div>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className='aspect-square animate-pulse rounded-md bg-muted' />
        ))}
      </div>
      <div className='h-24 animate-pulse rounded-lg bg-muted' />
    </div>
  )
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(locale, { dateStyle: 'medium' })
}
