import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save, X, Loader2 } from 'lucide-react'

import { Button } from '~/shared/ui/button'
import { cn } from '~/shared/lib/cn'

import {
  AssistantProfileBodyDtoAvailabilityStatus,
  MangakaProfileBodyDtoGenresItem,
  type AssistantProfileResDtoOutput,
  type MangakaProfileResDtoOutput
} from '~/api/model/users'
import {
  useProfileForm,
  type AssistantFormFields,
  type MangakaFormFields,
  type ProfileFormFields
} from '../hooks/use-profile-form'
import type { ProfileMode } from '../api/profile-api'
import { PortfolioUploader } from './portfolio-uploader'

// ── Enum sources ────────────────────────────────────────────────────────────
// FE-API-Guide-v2.md §2.2. Using both the swagger-generated `as const`
// objects (for runtime values / union-narrowing) and the literal types
// (so cast in hooks keeps BE in lock-step).

export const GENRES = Object.values(MangakaProfileBodyDtoGenresItem) as readonly MangakaProfileBodyDtoGenresItem[]
export const SPECIALIZATIONS = ['BACKGROUND','SCREENTONE','EFFECT_LINES','INKING','COLORING','LETTERING'] as const
export const AVAILABILITY_STATUSES = Object.values(AssistantProfileBodyDtoAvailabilityStatus) as readonly AssistantProfileBodyDtoAvailabilityStatus[]

type ProfileEditFormProps = {
  mode: ProfileMode
  data: MangakaProfileResDtoOutput | AssistantProfileResDtoOutput
  onCancel: () => void
  onSaved: () => void
}

/**
 * Edit form for the user's role-specific profile.
 *
 * - Pre-fills from the loaded data (or empty strings if `data.hasProfile`).
 * - Submit goes through {@link useProfileForm}, which validates + calls
 *   the correct upsert endpoint for the role.
 * - On success → toast + onSaved (parent usually toggles view-mode + reloads).
 */
export function ProfileEditForm({ mode, data, onCancel, onSaved }: ProfileEditFormProps) {
  const { t } = useTranslation('profile')
  const { errors, isSubmitting, submit, validate } = useProfileForm()

  const initial = useMemo<ProfileFormFields>(() => {
    if (mode === 'mangaka') {
      const m = data as MangakaProfileResDtoOutput
      return {
        penName: m.penName ?? '',
        genres: m.genres ?? [],
        experienceLevel: m.experienceLevel ?? '',
        bio: m.bio ?? '',
        portfolioFiles: m.portfolioFiles ?? []
      } as MangakaFormFields
    }
    const a = data as AssistantProfileResDtoOutput
    return {
      specializations: a.specializations ?? [],
      experienceLevel: a.experienceLevel ?? '',
      portfolioFiles: a.portfolioFiles ?? [],
      availabilityStatus: a.availabilityStatus ?? '',
      availabilityFrom: a.availabilityFrom ?? '',
      availabilityTo: a.availabilityTo ?? ''
    } as AssistantFormFields
  }, [data, mode])

  // Form state mirrors `initial` so the user can type.
  // We use `useState` with the initializer form so we lock the initial
  // snapshot. If you ever need to re-init after parent reload, key this
  // component with the data id.
  const [fields, setFields] = useState<ProfileFormFields>(initial)

  function setField(key: keyof ProfileFormFields, value: unknown): void {
    setFields((prev) => ({ ...prev, [key]: value }) as ProfileFormFields)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate(fields, mode)) return
    const saved = await submit(fields, mode)
    if (saved) onSaved()
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-foreground'>{t('editTitle', { mode: t(`role.${mode}`) })}</h1>
      </div>

      {/* ── Common fields ─────────────────────────────────────────────── */}
      <FieldRow label={t('fields.experienceLevel')} hint={t('hints.experienceLevel')}>
        <input
          type='text'
          value={(fields as MangakaFormFields & AssistantFormFields).experienceLevel}
          onChange={(e) => setField('experienceLevel', e.target.value)}
          maxLength={50}
          className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none'
        />
      </FieldRow>

      {/* ── Role-specific fields ──────────────────────────────────────── */}
      {mode === 'mangaka' && (
        <MangakaFields
          fields={fields as MangakaFormFields}
          errors={errors}
          setField={setField as unknown as Parameters<typeof MangakaFields>[0]['setField']}
          tKey={(key) => t(key)}
        />
      )}
      {mode === 'assistant' && (
        <AssistantFields
          fields={fields as AssistantFormFields}
          errors={errors}
          setField={setField as unknown as Parameters<typeof AssistantFields>[0]['setField']}
          tKey={(key) => t(key)}
        />
      )}

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className='flex items-center justify-end gap-3 border-t border-border pt-4'>
        <Button type='button' variant='ghost' onClick={onCancel} disabled={isSubmitting}>
          <X className='h-4 w-4' />
          {t('cancel')}
        </Button>
        <Button type='submit' disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className='h-4 w-4 animate-spin' /> : <Save className='h-4 w-4' />}
          {isSubmitting ? t('saving') : t('save')}
        </Button>
      </div>
    </form>
  )
}

// ── Sub-views per role ──────────────────────────────────────────────────────

function MangakaFields({
  fields,
  errors,
  setField,
  tKey
}: {
  fields: MangakaFormFields
  errors: Record<string, string>
  // External setter is typed narrowly (`unknown` at the top level) because
  // ProfileFormFields is a discriminated union; the runtime is fine.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setField: (key: keyof MangakaFormFields, value: any) => void
  tKey: (key: string) => string
}) {
  return (
    <>
      <FieldRow label={tKey('fields.penName')} error={errors.penName} required>
        <input
          type='text'
          value={fields.penName}
          onChange={(e) => setField('penName', e.target.value)}
          maxLength={100}
          className={inputCls(!!errors.penName)}
          required
        />
      </FieldRow>

      <FieldRow label={tKey('fields.genres')} hint={tKey('hints.genres')}>
        <CheckboxGroup
          options={GENRES.map((g) => ({ value: g, label: tKey(`genre.${g}`) }))}
          selected={fields.genres}
          onChange={(next) => setField('genres', next)}
        />
      </FieldRow>

      <FieldRow label={tKey('fields.bio')}>
        <textarea
          value={fields.bio}
          onChange={(e) => setField('bio', e.target.value)}
          rows={5}
          maxLength={5000}
          className={cn(inputCls(false), 'resize-y')}
        />
      </FieldRow>

      <FieldRow label={tKey('fields.portfolio')} hint={tKey('hints.portfolio')}>
        <PortfolioUploader
          keys={fields.portfolioFiles}
          onChange={(keys) => setField('portfolioFiles', keys)}
        />
      </FieldRow>
    </>
  )
}

function AssistantFields({
  fields,
  errors,
  setField,
  tKey
}: {
  fields: AssistantFormFields
  errors: Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setField: (key: keyof AssistantFormFields, value: any) => void
  tKey: (key: string) => string
}) {
  return (
    <>
      <FieldRow label={tKey('fields.specializations')} hint={tKey('hints.specializations')}>
        <CheckboxGroup
          options={SPECIALIZATIONS.map((s) => ({ value: s, label: tKey(`specialization.${s}`) }))}
          selected={fields.specializations}
          onChange={(next) => setField('specializations', next)}
        />
      </FieldRow>

      <FieldRow label={tKey('fields.availabilityStatus')} hint={tKey('hints.availabilityStatus')}>
        <select
          value={fields.availabilityStatus}
          onChange={(e) => setField('availabilityStatus', e.target.value)}
          className={inputCls(false)}
        >
          <option value=''>{tKey('availability.none')}</option>
          {AVAILABILITY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {tKey(`availability.${s}`)}
            </option>
          ))}
        </select>
      </FieldRow>

      <div className='grid gap-4 sm:grid-cols-2'>
        <FieldRow label={tKey('fields.availabilityFrom')}>
          <input
            type='datetime-local'
            value={fields.availabilityFrom ? toLocalInput(fields.availabilityFrom) : ''}
            onChange={(e) => {
              const next = e.target.value ? new Date(e.target.value).toISOString() : ''
              setField('availabilityFrom', next)
            }}
            className={inputCls(!!errors.availabilityFrom)}
          />
        </FieldRow>
        <FieldRow label={tKey('fields.availabilityTo')} error={errors.availabilityTo}>
          <input
            type='datetime-local'
            value={fields.availabilityTo ? toLocalInput(fields.availabilityTo) : ''}
            onChange={(e) => {
              const next = e.target.value ? new Date(e.target.value).toISOString() : ''
              setField('availabilityTo', next)
            }}
            className={inputCls(!!errors.availabilityTo)}
          />
        </FieldRow>
      </div>

      <FieldRow label={tKey('fields.portfolio')} hint={tKey('hints.portfolio')}>
        <PortfolioUploader
          keys={fields.portfolioFiles}
          onChange={(keys) => setField('portfolioFiles', keys)}
        />
      </FieldRow>
    </>
  )
}

// ── Reusable atoms ─────────────────────────────────────────────────────────

function FieldRow({
  label,
  hint,
  error,
  required,
  children
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className='space-y-1.5'>
      <label className='block text-sm font-semibold text-foreground'>
        {label}
        {required && <span className='ml-1 text-destructive'>*</span>}
      </label>
      {children}
      {hint && !error && <p className='text-xs text-muted-foreground'>{hint}</p>}
      {error && <p className='text-xs text-destructive'>{error}</p>}
    </div>
  )
}

function inputCls(hasError: boolean): string {
  return cn(
    'w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:outline-none',
    hasError ? 'border-destructive focus:border-destructive focus:ring-destructive' : 'border-input focus:border-primary focus:ring-ring'
  )
}

function CheckboxGroup<T extends string>({
  options,
  selected,
  onChange
}: {
  options: Array<{ value: T; label: string }>
  selected: T[]
  onChange: (next: T[]) => void
}) {
  function toggle(value: T) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }
  return (
    <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
      {options.map((opt) => {
        const checked = selected.includes(opt.value)
        return (
          <label
            key={opt.value}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
              checked
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-background hover:bg-muted/30'
            )}
          >
            <input
              type='checkbox'
              checked={checked}
              onChange={() => toggle(opt.value)}
              className='h-4 w-4 accent-primary'
            />
            <span>{opt.label}</span>
          </label>
        )
      })}
    </div>
  )
}

function toLocalInput(iso: string): string {
  // datetime-local wants "YYYY-MM-DDTHH:mm" without TZ.
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}