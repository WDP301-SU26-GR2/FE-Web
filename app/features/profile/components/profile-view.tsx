import { useTranslation } from 'react-i18next'
import { Pencil, Star, Award } from 'lucide-react'

import type {
  AssistantProfileResDtoOutput,
  MangakaProfileResDtoOutput
} from '~/api/model/users'
import { SignedImage } from '~/shared/components/signed-image'
import { Button } from '~/shared/ui/button'
import { cn } from '~/shared/lib/cn'

import type { ProfileMode } from '../api/profile-api'

type ProfileViewProps = {
  mode: ProfileMode
  data: MangakaProfileResDtoOutput | AssistantProfileResDtoOutput
  onEdit: () => void
}

/**
 * Read-only rendering of the user's profile. Shows the fields appropriate to
 * the role (Mangaka vs Assistant) plus the reputation summary that lives on
 * `MangakaProfileRes` / `AssistantProfileRes`.
 *
 * If `data.hasProfile === false`, a hint card surfaces; the field values
 * themselves are null/empty from BE.
 */
export function ProfileView({ mode, data, onEdit }: ProfileViewProps) {
  const { t } = useTranslation('profile')

  return (
    <div className='space-y-6'>
      {/* ── Header / reputation summary ─────────────────────────────── */}
      <div className='flex flex-col gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-bold text-foreground'>
              {mode === 'mangaka'
                ? (data as MangakaProfileResDtoOutput).penName ?? t('emptyPenName')
                : t('role.assistant')}
            </h1>
            {data.isRecommended && (
              <span className='inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase text-primary'>
                <Award className='h-3.5 w-3.5' />
                {t('recommendedBadge')}
              </span>
            )}
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>
            {t(`role.${mode}`)}
          </p>
        </div>

        <ReputationSummary reputation={data.reputationScore} ratingAvg={data.ratingAvg} ratingCount={data.ratingCount} />

        <Button type='button' variant='outline' size='sm' onClick={onEdit}>
          <Pencil className='h-4 w-4' />
          {t('edit')}
        </Button>
      </div>

      {!data.hasProfile && (
        <div className='rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground'>
          {t('noProfileHint')}
        </div>
      )}

      {mode === 'mangaka' ? (
        <MangakaDetail data={data as MangakaProfileResDtoOutput} />
      ) : (
        <AssistantDetail data={data as AssistantProfileResDtoOutput} />
      )}
    </div>
  )
}

function ReputationSummary({
  reputation,
  ratingAvg,
  ratingCount
}: {
  reputation: number
  ratingAvg: number
  ratingCount: number
}) {
  const { t } = useTranslation('profile')
  return (
    <div className='flex items-center gap-6'>
      <div className='text-center'>
        <div className='text-2xl font-bold text-foreground tabular-nums'>
          {reputation.toFixed(1)}
        </div>
        <div className='text-xs uppercase tracking-wide text-muted-foreground'>
          {t('reputation')}
        </div>
      </div>
      <div className='text-center'>
        <div className='flex items-center justify-center gap-1 text-2xl font-bold text-foreground tabular-nums'>
          <Star className='h-5 w-5 fill-current text-primary' />
          {ratingAvg.toFixed(1)}
        </div>
        <div className='text-xs uppercase tracking-wide text-muted-foreground'>
          {t('ratingCount', { count: ratingCount })}
        </div>
      </div>
    </div>
  )
}

function MangakaDetail({ data }: { data: MangakaProfileResDtoOutput }) {
  const { t } = useTranslation('profile')
  return (
    <div className='space-y-6 rounded-lg border border-border bg-card p-6'>
      <Section title={t('sections.genres')}>
        {data.genres.length === 0 ? (
          <EmptyValue label={t('empty')} />
        ) : (
          <div className='flex flex-wrap gap-2'>
            {data.genres.map((g) => (
              <span
                key={g}
                className='inline-flex items-center rounded bg-secondary px-2.5 py-1 text-xs font-medium uppercase text-secondary-foreground'
              >
                {t(`genre.${g}`, { defaultValue: g })}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title={t('sections.experienceLevel')}>
        {data.experienceLevel ? <span className='text-sm'>{data.experienceLevel}</span> : <EmptyValue label={t('empty')} />}
      </Section>

      <Section title={t('sections.bio')}>
        {data.bio ? <p className='whitespace-pre-line text-sm leading-relaxed'>{data.bio}</p> : <EmptyValue label={t('empty')} />}
      </Section>

      <Section title={t('sections.portfolio')}>
        {data.portfolioFiles.length === 0 ? (
          <EmptyValue label={t('empty')} />
        ) : (
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
            {data.portfolioFiles.map((key) => (
              <SignedImage
                key={key}
                r2Key={key}
                alt={t('portfolioAlt', { key })}
                aspectClassName='aspect-square'
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function AssistantDetail({ data }: { data: AssistantProfileResDtoOutput }) {
  const { t } = useTranslation('profile')
  return (
    <div className='space-y-6 rounded-lg border border-border bg-card p-6'>
      <Section title={t('sections.specializations')}>
        {data.specializations.length === 0 ? (
          <EmptyValue label={t('empty')} />
        ) : (
          <div className='flex flex-wrap gap-2'>
            {data.specializations.map((s) => (
              <span
                key={s}
                className='inline-flex items-center rounded bg-secondary px-2.5 py-1 text-xs font-medium uppercase text-secondary-foreground'
              >
                {t(`specialization.${s}`, { defaultValue: s })}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title={t('sections.availability')}>
        <div className='flex flex-col gap-1 text-sm'>
          <div>
            <span className='text-muted-foreground'>{t('sections.availabilityStatus')}: </span>
            {data.availabilityStatus ? (
              <span className='font-medium'>
                {t(`availability.${data.availabilityStatus}`, {
                  defaultValue: data.availabilityStatus
                })}
              </span>
            ) : (
              <EmptyValue label={t('empty')} />
            )}
          </div>
          {(data.availabilityFrom || data.availabilityTo) && (
            <div className='text-muted-foreground'>
              {formatRange(data.availabilityFrom, data.availabilityTo)}
            </div>
          )}
        </div>
      </Section>

      <Section title={t('sections.experienceLevel')}>
        {data.experienceLevel ? <span className='text-sm'>{data.experienceLevel}</span> : <EmptyValue label={t('empty')} />}
      </Section>

      <Section title={t('sections.portfolio')}>
        {data.portfolioFiles.length === 0 ? (
          <EmptyValue label={t('empty')} />
        ) : (
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
            {data.portfolioFiles.map((key) => (
              <SignedImage
                key={key}
                r2Key={key}
                alt={t('portfolioAlt', { key })}
                aspectClassName='aspect-square'
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='space-y-2'>
      <h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>{title}</h2>
      {children}
    </section>
  )
}

function EmptyValue({ label }: { label: string }) {
  return <span className={cn('text-sm italic text-muted-foreground/70')}>— {label} —</span>
}

function formatRange(from: string | null, to: string | null): string {
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
  return `${fmt(from)}  →  ${fmt(to)}`
}