import {
  usersControllerGetMyAssistantProfile,
  usersControllerGetMyMangakaProfile,
  usersControllerUpsertAssistantProfile,
  usersControllerUpsertMangakaProfile
} from '~/api/operations/users/users'
import {
  AssistantProfileBodyDtoAvailabilityStatus,
  AssistantProfileBodyDtoSpecializationsItem,
  MangakaProfileBodyDtoGenresItem,
  type AssistantProfileResDtoOutput,
  type MangakaProfileResDtoOutput
} from '~/api/model/users'

import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'

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
  experienceLevel?: string
  bio?: string
  portfolioFiles?: string[]
}

export type AssistantProfileSubmit = {
  specializations: AssistantProfileBodyDtoSpecializationsItem[]
  experienceLevel?: string
  portfolioFiles?: string[]
  availabilityStatus?: AssistantProfileBodyDtoAvailabilityStatus
  availabilityFrom?: string
  availabilityTo?: string
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
  return { data: res.data, mode }
}

/**
 * Re-export so feature code only needs this module for error formatting.
 */
export { extractApiErrorMessage as readProfileError }

/**
 * Persist a Mangaka profile (upsert). Returns the new state from BE.
 */
export async function saveMangakaProfile(
  payload: MangakaProfileSubmit
): Promise<MangakaProfileResDtoOutput> {
  const res = await usersControllerUpsertMangakaProfile(payload)
  if (!res.data) {
    throw new Error('Empty response saving Mangaka profile')
  }
  return res.data
}

/**
 * Persist an Assistant profile (upsert). Returns the new state from BE.
 */
export async function saveAssistantProfile(
  payload: AssistantProfileSubmit
): Promise<AssistantProfileResDtoOutput> {
  const res = await usersControllerUpsertAssistantProfile(payload)
  if (!res.data) {
    throw new Error('Empty response saving Assistant profile')
  }
  return res.data
}