import {
  usersControllerGetMyAssistantProfile,
  usersControllerGetMyMangakaProfile,
  usersControllerUpsertAssistantProfile,
  usersControllerUpsertMangakaProfile,
  usersControllerGetMe,
  usersControllerUpdateMe
} from '~/api/operations/users/users'
import {
  AssistantProfileBodyDtoAvailabilityStatus,
  AssistantProfileBodyDtoExperienceLevel,
  AssistantProfileBodyDtoSpecializationsItem,
  MangakaProfileBodyDtoGenresItem,
  MangakaProfileBodyDtoExperienceLevel,
  type AssistantProfileResDtoOutput,
  type MangakaProfileResDtoOutput,
  type MeResDtoOutput,
  type UpdateMeBodyDto
} from '~/api/model/users'

import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

/**
 * Tag value matters: form submit + view use this discriminated union to know
 * which endpoint to call.
 */
export type ProfileMode = 'mangaka' | 'assistant'

export type MyProfileData = {
  /** Profile for the signed-in user (Mangaka or Assistant variant). */
  data: MangakaProfileResDtoOutput | AssistantProfileResDtoOutput
  mode: ProfileMode
}

export type MangakaProfileSubmit = {
  penName: string
  genres: MangakaProfileBodyDtoGenresItem[]
  experienceLevel?: MangakaProfileBodyDtoExperienceLevel
  bio?: string
  portfolioFiles?: string[]
}

export type AssistantProfileSubmit = {
  specializations: AssistantProfileBodyDtoSpecializationsItem[]
  experienceLevel?: AssistantProfileBodyDtoExperienceLevel
  portfolioFiles?: string[]
  availabilityStatus?: AssistantProfileBodyDtoAvailabilityStatus
  availabilityFrom?: string
  availabilityTo?: string
}

function normalizeAssistantProfile(profile: AssistantProfileResDtoOutput): AssistantProfileResDtoOutput {
  return {
    ...profile,
    specializations: Array.isArray(profile.specializations) ? profile.specializations : [],
    portfolioFiles: Array.isArray(profile.portfolioFiles) ? profile.portfolioFiles : [],
    reputationScore: typeof profile.reputationScore === 'number' ? profile.reputationScore : 0,
    ratingAvg: typeof profile.ratingAvg === 'number' ? profile.ratingAvg : 0,
    ratingCount: typeof profile.ratingCount === 'number' ? profile.ratingCount : 0,
    hasProfile: Boolean(profile.hasProfile)
  }
}

/**
 * Fetch the "my profile" record matching the role. Returns null on 404 so
 * callers can show an "empty profile" empty state.
 *
 * Other errors bubble up — the caller's `catch` can decide how to display
 * them. We intentionally do NOT swallow 404 here because "no profile row" is
 * a distinct, well-formed state (the user is real but hasn't built one yet).
 */
export async function fetchMyProfile(mode: ProfileMode): Promise<MyProfileData | null> {
  if (mode === 'mangaka') {
    const res = await usersControllerGetMyMangakaProfile()
    if (!res.data) return null
    return { data: res.data, mode }
  }
  const res = await usersControllerGetMyAssistantProfile()
  if (!res.data) return null
  return { data: normalizeAssistantProfile(res.data), mode }
}

/**
 * Re-export so feature code only needs this module for error formatting.
 */
export { extractApiErrorMessage as readProfileError }

/**
 * Persist a Mangaka profile (upsert). Returns the new state from BE.
 */
export async function saveMangakaProfile(payload: MangakaProfileSubmit): Promise<MangakaProfileResDtoOutput> {
  const res = await usersControllerUpsertMangakaProfile(payload)
  if (!res.data) {
    throw new Error('Empty response saving Mangaka profile')
  }
  return res.data
}

/**
 * Persist an Assistant profile (upsert). Returns the new state from BE.
 */
export async function saveAssistantProfile(payload: AssistantProfileSubmit): Promise<AssistantProfileResDtoOutput> {
  const res = await usersControllerUpsertAssistantProfile(payload)
  if (!res.data) {
    throw new Error('Empty response saving Assistant profile')
  }
  return normalizeAssistantProfile(res.data)
}

// ── Account info (PATCH /me) ─────────────────────────────────────────────────

export type AccountInfo = MeResDtoOutput

export type AccountInfoSubmit = {
  name?: string
  displayName?: string | null
  avatar?: string | null
  phoneNumber?: string
}

/**
 * Fetch the signed-in user's account info (name/email/avatar/phoneNumber/role/status).
 */
export async function fetchAccountInfo(): Promise<AccountInfo> {
  const res = await usersControllerGetMe()
  if (!res.data) {
    throw new Error('Empty response fetching account info')
  }
  return res.data
}

/**
 * Persist account info changes (PATCH /me). Returns the updated account from BE.
 * - omit/null = keep current
 * - '' (empty string) = delete nullable fields (displayName, avatar)
 */
export async function saveAccountInfo(payload: AccountInfoSubmit): Promise<AccountInfo> {
  const res = await usersControllerUpdateMe(payload as UpdateMeBodyDto)
  if (!res.data) {
    throw new Error('Empty response saving account info')
  }
  return res.data
}
