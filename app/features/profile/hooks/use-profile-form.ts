import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  readProfileError,
  saveAssistantProfile,
  saveMangakaProfile,
  type MyProfileData,
  type ProfileMode
} from '../api/profile-api'

import {
  AssistantProfileBodyDtoAvailabilityStatus,
  AssistantProfileBodyDtoSpecializationsItem,
  MangakaProfileBodyDtoGenresItem,
  type AssistantProfileResDtoOutput,
  type MangakaProfileResDtoOutput
} from '~/api/model/users'

// ── Field shapes used by the edit form ──────────────────────────────────────
// These are flat strings (no nested enums) so the form state stays trivial;
// we serialise to API DTOs at submit time.

export type MangakaFormFields = {
  penName: string
  genres: MangakaProfileBodyDtoGenresItem[]
  experienceLevel: string
  bio: string
  portfolioFiles: string[]
}

export type AssistantFormFields = {
  specializations: AssistantProfileBodyDtoSpecializationsItem[]
  experienceLevel: string
  portfolioFiles: string[]
  availabilityStatus: string
  availabilityFrom: string
  availabilityTo: string
}

export type ProfileFormFields = MangakaFormFields | AssistantFormFields

type UseProfileFormResult = {
  /** Per-field validation messages keyed by English field name (translate at render). */
  errors: Record<string, string>
  isSubmitting: boolean
  /** Validate the current fields. Returns true if no errors. */
  validate: (fields: ProfileFormFields, mode: ProfileMode) => boolean
  /** Submit the form. Resolves to the saved profile on success, null on error. */
  submit: (fields: ProfileFormFields, mode: ProfileMode) => Promise<MyProfileData | null>
}

/**
 * Form submit/validate hook for the profile edit form.
 *
 * Manual validation (no react-hook-form/zod) per feature decision — the form
 * surface is small enough that pulling a form lib in for just this would
 * be overkill.
 *
 * Validation runs only on submit (no per-keystroke noise); per-field errors
 * stored in `errors` and displayed inline by the form.
 */
export function useProfileForm(): UseProfileFormResult {
  const { t } = useTranslation('profile')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = useCallback(
    (fields: ProfileFormFields, mode: ProfileMode): boolean => {
      const next: Record<string, string> = {}

      if (mode === 'mangaka') {
        const m = fields as MangakaFormFields
        if (!m.penName.trim()) next.penName = t('errors.penNameRequired')
        else if (m.penName.length > 100) next.penName = t('errors.penNameTooLong')
      } else {
        const a = fields as AssistantFormFields
        if (a.availabilityFrom && a.availabilityTo) {
          if (Date.parse(a.availabilityFrom) > Date.parse(a.availabilityTo)) {
            next.availabilityTo = t('errors.availabilityRangeInvalid')
          }
        }
      }

      setErrors(next)
      return Object.keys(next).length === 0
    },
    [t]
  )

  const submit = useCallback(
    async (fields: ProfileFormFields, mode: ProfileMode): Promise<MyProfileData | null> => {
      if (!validate(fields, mode)) return null
      setIsSubmitting(true)
      try {
        if (mode === 'mangaka') {
          const m = fields as MangakaFormFields
          const saved: MangakaProfileResDtoOutput = await saveMangakaProfile({
            penName: m.penName.trim(),
            genres: m.genres as MangakaProfileBodyDtoGenresItem[],
            ...(m.experienceLevel.trim() ? { experienceLevel: m.experienceLevel.trim() } : {}),
            ...(m.bio.trim() ? { bio: m.bio.trim() } : {}),
            portfolioFiles: m.portfolioFiles
          })
          toast.success(t('saveSuccess'))
          return { data: saved, mode }
        }
        const a = fields as AssistantFormFields
        const status = a.availabilityStatus
          ? (a.availabilityStatus as AssistantProfileBodyDtoAvailabilityStatus)
          : undefined
        const saved: AssistantProfileResDtoOutput = await saveAssistantProfile({
          specializations: a.specializations,
          ...(a.experienceLevel.trim() ? { experienceLevel: a.experienceLevel.trim() } : {}),
          portfolioFiles: a.portfolioFiles,
          ...(status ? { availabilityStatus: status } : {}),
          ...(a.availabilityFrom ? { availabilityFrom: a.availabilityFrom } : {}),
          ...(a.availabilityTo ? { availabilityTo: a.availabilityTo } : {})
        })
        toast.success(t('saveSuccess'))
        return { data: saved, mode }
      } catch (err: unknown) {
        toast.error(readProfileError(err, t('errors.saveGeneric')))
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [t, validate]
  )

  return { errors, isSubmitting, validate, submit }
}