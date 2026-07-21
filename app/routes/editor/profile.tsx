import { usersControllerGetMyStaffProfile, usersControllerUpsertStaffProfile } from '~/api/operations/users/users'
import { EditorProfilePage, type EditorActionResult } from '~/features/editor'
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
    await usersControllerUpsertStaffProfile({
      specialtyGenres: String(form.get('specialtyGenres') ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean) as never[],
      demographics: String(form.get('demographics') ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean) as never[],
      bio: String(form.get('bio') ?? ''),
      yearsOfExperience: Number(form.get('yearsOfExperience') ?? 0)
    })
    return { ok: true, intent, messageKey: 'profileUpdated' }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function EditorProfileRoute({ loaderData }: Route.ComponentProps) {
  return <EditorProfilePage profile={loaderData} />
}
