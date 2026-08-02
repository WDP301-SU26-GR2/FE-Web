import { usersControllerGetMyStaffProfile, usersControllerUpsertStaffProfile } from '~/api/operations/users/users'
import { EditorProfilePage, type EditorActionResult } from '~/features/editor'
import { StaffProfileBodyDtoDemographicsItem, StaffProfileBodyDtoSpecialtyGenresItem } from '~/api/model/users'
import type { Route } from './+types/profile'

export async function clientLoader() {
  const response = await usersControllerGetMyStaffProfile()
  return response.status === 200
    ? response.data
    : {
        userId: '',
        role: 'EDITOR' as const,
        specialtyGenres: [],
        demographics: [],
        bio: null,
        yearsOfExperience: null,
        displayName: null,
        avatar: null,
        hasProfile: false
      }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = 'saveProfile'
  try {
    const specialtyGenres = parseEnumList(
      form,
      'specialtyGenres',
      Object.values(StaffProfileBodyDtoSpecialtyGenresItem)
    )
    const demographics = parseEnumList(form, 'demographics', Object.values(StaffProfileBodyDtoDemographicsItem))
    const bio = String(form.get('bio') ?? '')
    const yearsValue = String(form.get('yearsOfExperience') ?? '').trim()
    const yearsOfExperience = yearsValue ? Number(yearsValue) : undefined
    if (
      bio.length > 2000 ||
      (yearsOfExperience != null &&
        (!Number.isInteger(yearsOfExperience) || yearsOfExperience < 0 || yearsOfExperience > 80))
    )
      return { ok: false, intent, errorKey: 'invalidAction' }
    await usersControllerUpsertStaffProfile({
      specialtyGenres,
      demographics,
      bio,
      yearsOfExperience
    })
    return { ok: true, intent, messageKey: 'profileUpdated' }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

function parseEnumList<T extends string>(form: FormData, key: string, allowedValues: readonly T[]) {
  const allowed = new Set<string>(allowedValues)
  const values = String(form.get(key) ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (values.some((value) => !allowed.has(value))) throw new Error(`Invalid ${key}`)
  return [...new Set(values)] as T[]
}

export default function EditorProfileRoute({ loaderData }: Route.ComponentProps) {
  return <EditorProfilePage profile={loaderData} />
}
