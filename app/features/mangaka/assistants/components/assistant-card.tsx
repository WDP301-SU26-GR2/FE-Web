import { useTranslation } from 'react-i18next'
import { Star, Sparkles, CheckCircle2, UserPlus } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { SignedImage } from '~/shared/components/signed-image'
import { Button } from '~/shared/ui'
import type { AssistantDirectoryListResDtoOutputItemsItem } from '~/api/model/users'

export type AssistantCardProps = {
  assistant: AssistantDirectoryListResDtoOutputItemsItem
  /** True when the current Mangaka already has an ACTIVE assignment with this
   *  assistant. The card disables the invite CTA in that case to mirror the
   *  BE 409 `Error.DuplicateActiveCollaboration`. */
  hasActiveAssignment: boolean
  onInvite: (assistant: AssistantDirectoryListResDtoOutputItemsItem) => void
}

const AVAILABILITY_META: Record<string, { className: string }> = {
  AVAILABLE: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  BUSY: { className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  ON_LEAVE: { className: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  UNAVAILABLE: { className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' }
}

function getInitials(name: string | null | undefined, fallback: string): string {
  const cleaned = (name ?? '').trim()
  if (!cleaned) return fallback.slice(0, 2).toUpperCase()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

const AVATAR_GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-purple-600 to-pink-700',
  'from-amber-600 to-orange-700',
  'from-emerald-600 to-teal-700',
  'from-rose-600 to-pink-700',
  'from-sky-600 to-cyan-700'
] as const

function pickGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

/**
 * Visual representation of one assistant from the directory.
 *
 * - Avatar: initials gradient placeholder (the `avatar` field from the API is
 *   an R2 object key, but per §4.3 it's often null; placeholder keeps the card
 *   visually consistent without forcing a sign-download call per card).
 * - "Recommended" chip from `isRecommended`.
 * - Reputation + rating + portfolio count summary.
 * - Specializations + experience level + availability window.
 * - "Mời cộng tác" CTA — disabled when an active assignment already exists.
 */
export function AssistantCard({ assistant, hasActiveAssignment, onInvite }: AssistantCardProps) {
  const { t, i18n } = useTranslation('mangaka')
  const locale = i18n.language

  const availabilityKey = assistant.availabilityStatus ?? 'UNAVAILABLE'
  const availabilityMeta = AVAILABILITY_META[availabilityKey] ?? AVAILABILITY_META.UNAVAILABLE
  const fallbackSeed = assistant.displayName ?? assistant.userId
  const portfolioCount = assistant.portfolioFiles?.length ?? 0

  return (
    <article className='flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md'>
      <header className='flex items-start gap-3'>
        {assistant.avatar ? (
          <SignedImage
            r2Key={assistant.avatar}
            alt={assistant.displayName ?? t('assistantDirectory.card.unnamedAssistant')}
            aspectClassName='aspect-square'
            className='h-12 w-12 shrink-0 rounded-full shadow-sm'
          />
        ) : (
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-extrabold text-white shadow-sm',
              pickGradient(fallbackSeed)
            )}
            aria-hidden='true'
          >
            {getInitials(assistant.displayName, assistant.userId)}
          </div>
        )}
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-1.5'>
            <h3 className='truncate text-sm font-bold text-foreground'>
              {assistant.displayName ?? t('assistantDirectory.card.unnamedAssistant')}
            </h3>
            {assistant.isRecommended && (
              <span
                title={t('assistantDirectory.card.recommended')}
                className='inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600'
              >
                <Sparkles className='h-3 w-3' />
                {t('assistantDirectory.card.recommended')}
              </span>
            )}
          </div>
          {assistant.experienceLevel && (
            <p className='truncate text-xs text-muted-foreground'>{assistant.experienceLevel}</p>
          )}
        </div>
      </header>

      <div className='flex flex-wrap items-center gap-2 text-[11px]'>
        <span
          className='inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 font-semibold text-secondary-foreground'
          title={t('assistantDirectory.card.reputationTitle')}
        >
          <Star className='h-3 w-3 text-amber-500' />
          <span>{t('assistantDirectory.card.reputation', { score: assistant.reputationScore.toFixed(1) })}</span>
        </span>
        <span
          className='inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 font-semibold text-secondary-foreground'
          title={t('assistantDirectory.card.ratingTitle')}
        >
          <Star className='h-3 w-3 text-amber-500' />
          <span>
            {t('assistantDirectory.card.rating', { avg: assistant.ratingAvg.toFixed(1), count: assistant.ratingCount })}
          </span>
        </span>
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 font-bold uppercase tracking-wider',
            availabilityMeta.className
          )}
        >
          {t(`assistantDirectory.card.availability.${availabilityKey}`)}
        </span>
      </div>

      {assistant.specializations.length > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          {assistant.specializations.map((spec) => (
            <span
              key={spec}
              className='inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground'
            >
              {t(`assistantDirectory.card.specialization.${spec}`)}
            </span>
          ))}
        </div>
      )}

      {(assistant.availabilityFrom || assistant.availabilityTo) && (
        <div className='text-[11px] text-muted-foreground'>
          <span>
            {t('assistantDirectory.card.availableWindow', {
              from: formatDate(assistant.availabilityFrom, locale),
              to: formatDate(assistant.availabilityTo, locale)
            })}
          </span>
        </div>
      )}

      <footer className='mt-auto flex items-center justify-between border-t border-border pt-3'>
        <span className='text-[11px] text-muted-foreground'>
          {t('assistantDirectory.card.portfolioCount', { count: portfolioCount })}
        </span>
        {hasActiveAssignment ? (
          <span
            className='inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600'
            title={t('assistantDirectory.card.activeAssignmentTitle')}
          >
            <CheckCircle2 className='h-3.5 w-3.5' />
            {t('assistantDirectory.card.activeAssignment')}
          </span>
        ) : (
          <Button
            type='button'
            variant='primary'
            size='sm'
            onClick={() => onInvite(assistant)}
            aria-label={t('assistantDirectory.card.inviteAriaLabel', {
              name: assistant.displayName ?? assistant.userId
            })}
          >
            <UserPlus className='h-3.5 w-3.5' />
            {t('assistantDirectory.card.invite')}
          </Button>
        )}
      </footer>
    </article>
  )
}
