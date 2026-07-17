import { usersControllerGetMyStaffProfile, usersControllerUpsertStaffProfile } from '~/api/operations/users/users'
import { BoardProfilePage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/profile'

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
    await usersControllerUpsertStaffProfile({
      specialtyGenres: list(form, 'specialtyGenres') as never[],
      demographics: list(form, 'demographics') as never[],
      yearsOfExperience: Number(form.get('yearsOfExperience') ?? 0),
      bio: String(form.get('bio') ?? '')
    })
    return { ok: true, intent }
  } catch {
    return { ok: false, intent }
  }
}

function list(form: FormData, key: string) {
  return String(form.get(key) ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardProfilePage profile={loaderData} />
}
