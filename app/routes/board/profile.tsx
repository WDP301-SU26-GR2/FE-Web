import { usersControllerGetMyStaffProfile, usersControllerUpsertStaffProfile } from '~/api/operations/users/users'
import { StaffProfileBodyDtoDemographicsItem, StaffProfileBodyDtoSpecialtyGenresItem } from '~/api/model/users'
import { BoardProfilePage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/profile'
import { isEnumValue } from '~/shared/lib/is-enum-value'
import { extractApiErrorCode } from '~/shared/lib/api/extract-api-error'

export async function clientLoader() {
  const response = await usersControllerGetMyStaffProfile()
  return response.status === 200
    ? response.data
    : {
        userId: '',
        role: 'BOARD_MEMBER' as const,
        specialtyGenres: [],
        demographics: [],
        bio: null,
        yearsOfExperience: null,
        displayName: null,
        avatar: null,
        hasProfile: false
      }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = 'save'
  try {
    const specialtyGenres = enumValues(form, 'specialtyGenres', StaffProfileBodyDtoSpecialtyGenresItem)
    const demographics = enumValues(form, 'demographics', StaffProfileBodyDtoDemographicsItem)
    const yearsOfExperience = Number(form.get('yearsOfExperience') ?? 0)
    const bio = String(form.get('bio') ?? '').trim()
    if (!Number.isFinite(yearsOfExperience) || yearsOfExperience < 0 || yearsOfExperience > 80 || bio.length > 2000)
      return { ok: false, intent }
    await usersControllerUpsertStaffProfile({
      specialtyGenres,
      demographics,
      yearsOfExperience,
      bio
    })
    return { ok: true, intent, messageKey: 'profileUpdated' }
  } catch (error) {
    return { ok: false, intent, errorCode: extractApiErrorCode(error) }
  }
}

function enumValues<T extends string>(form: FormData, key: string, values: Record<string, T>): T[] {
  const selected = form.getAll(key).map(String)
  if (selected.some((value) => !isEnumValue(values, value))) throw new Error(`Invalid ${key}`)
  return selected as T[]
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardProfilePage profile={loaderData} />
}
